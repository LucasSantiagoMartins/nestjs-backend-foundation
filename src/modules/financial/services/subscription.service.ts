import { EmailTemplateType } from '@backend-foundation/common/enums/email-template-type.enum';
import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { QUEUES } from '@infra/queue/queue.constants';
import { NotificationService } from '@modules/notification/services/notification.service';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource, IsNull, Repository } from 'typeorm';
import { CreatePaymentAttemptDto } from '../dtos/create-payment-attempt.dto';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { SubscriptionMeResponseDto } from '../dtos/subscription-me-response.dto';
import { SubscriptionResponseDto } from '../dtos/subscription-response.dto';
import { Payment } from '../entities/payment.entity';
import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { PaymentService } from './payment.service';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptions: Repository<Subscription>,
    @InjectRepository(Plan) private readonly plans: Repository<Plan>,
    private readonly paymentsService: PaymentService,
    private readonly dataSource: DataSource,
    @InjectQueue(QUEUES.MAIL) private readonly mailQueue: Queue,
    private readonly notificationService: NotificationService,
    private readonly logger: AppLogger,
  ) {}

  async create(
    userId: number,
    dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const plan = await this.plans.findOneBy({ id: dto.planId });
    if (!plan) throw new NotFoundException('Plano não encontrado.');

    if (!plan.isActive)
      throw new BadRequestException(
        'O plano não permite iniciar uma subscrição.',
      );
    if (dto.billingPeriod === 'YEARLY' && plan.yearlyPrice == null) {
      throw new BadRequestException(
        'Este plano não tem preço anual configurado.',
      );
    }

    const subscription = await this.subscriptions.save(
      this.subscriptions.create({
        userId,
        plan,
        billingPeriod: dto.billingPeriod,
        status: SubscriptionStatus.PENDING_PAYMENT,
        startedAt: null,
      }),
    );

    await this.paymentsService.createAndEnqueue(
      subscription,
      dto.paymentMethod,
    );

    return this.findOne(subscription.id, userId);
  }

  async retryPayment(
    subscriptionId: number,
    userId: number,
    dto: CreatePaymentAttemptDto,
  ): Promise<SubscriptionResponseDto> {
    const payment = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Subscription);
      // PostgreSQL cannot apply FOR UPDATE to the nullable side of the LEFT
      // JOIN TypeORM creates for relations. Lock the subscription row alone,
      // then load its plan while the transaction still holds that lock.
      const lockedSubscription = await repository.findOne({
        where: { id: subscriptionId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedSubscription) {
        throw new NotFoundException('Subscrição não encontrada.');
      }

      if (lockedSubscription.status !== SubscriptionStatus.PAYMENT_FAILED) {
        throw new BadRequestException(
          'Só é possível criar uma nova tentativa após uma falha de pagamento.',
        );
      }

      const subscription = await repository.findOne({
        where: { id: subscriptionId, userId },
        relations: { plan: true },
      });
      if (!subscription) {
        throw new NotFoundException('Subscrição não encontrada.');
      }

      const updated = await repository.update(
        {
          id: subscriptionId,
          userId,
          status: SubscriptionStatus.PAYMENT_FAILED,
        },
        { status: SubscriptionStatus.PENDING_PAYMENT },
      );
      if (!updated.affected) {
        throw new BadRequestException(
          'A subscrição já foi atualizada por outra tentativa de pagamento.',
        );
      }

      subscription.status = SubscriptionStatus.PENDING_PAYMENT;
      return this.paymentsService.createPending(
        subscription,
        dto.paymentMethod,
        manager,
      );
    });

    await this.paymentsService.enqueue(payment);

    return this.findOne(subscriptionId, userId);
  }

  async finalizePayment(
    subscriptionId: number,
    paymentId: number,
  ): Promise<void> {
    const payment = await this.paymentsService.findForSubscription(
      subscriptionId,
      paymentId,
    );

    let mail:
      | {
          to: string;
          template: EmailTemplateType;
          context: Record<string, unknown>;
        }
      | undefined;
    let notification:
      { userId: number; title: string; message: string } | undefined;

    await this.dataSource.transaction(async (manager) => {
      const subscriptionRepository = manager.getRepository(Subscription);
      // Lock only the subscription row. Locking a query with nullable joined
      // relations (user/profile) can fail on PostgreSQL outer joins.
      const lockedSubscription = await subscriptionRepository.findOne({
        where: { id: subscriptionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedSubscription)
        throw new NotFoundException('Subscrição não encontrada.');

      const subscription = await subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: { user: { profile: true }, plan: true },
      });

      if (!subscription)
        throw new NotFoundException('Subscrição não encontrada.');

      const persistedPayment = await manager.getRepository(Payment).findOne({
        where: { id: paymentId, subscription: { id: subscriptionId } },
      });

      if (!persistedPayment)
        throw new NotFoundException(
          'Pagamento não encontrado para esta subscrição.',
        );
      if (subscription.status === SubscriptionStatus.CANCELLED) return;

      const latestPayment = await manager.getRepository(Payment).findOne({
        where: { subscription: { id: subscriptionId } },
        order: { id: 'DESC' },
      });
      const isLatestAttempt = latestPayment?.id === persistedPayment.id;

      if (persistedPayment.status === PaymentStatus.SUCCEEDED) {
        if (isLatestAttempt) {
          const wasActive = subscription.status === SubscriptionStatus.ACTIVE;
          subscription.status = SubscriptionStatus.ACTIVE;
          subscription.startedAt ??= new Date();
          if (!wasActive) {
            notification = {
              userId: subscription.user.id,
              title: 'Subscrição ativa',
              message: `O pagamento do plano ${subscription.plan.name} foi confirmado e a tua subscrição está ativa.`,
            };
          }
        }
        if (!persistedPayment.successEmailQueuedAt && subscription.user.email) {
          mail = {
            to: subscription.user.email,
            template: EmailTemplateType.SUBSCRIPTION_PAYMENT_SUCCEEDED,
            context: {
              userName: subscription.user.profile?.fullName,
              planName: subscription.plan.name,
              amount: persistedPayment.amount,
              currency: persistedPayment.currency,
              paymentReference:
                persistedPayment.providerReference ?? `#${persistedPayment.id}`,
            },
          };
        }
        await manager.getRepository(Subscription).save(subscription);
        return;
      }

      if (persistedPayment.status !== PaymentStatus.FAILED) return;
      if (
        isLatestAttempt &&
        subscription.status !== SubscriptionStatus.ACTIVE
      ) {
        const wasPaymentFailed =
          subscription.status === SubscriptionStatus.PAYMENT_FAILED;
        subscription.status = SubscriptionStatus.PAYMENT_FAILED;
        if (!wasPaymentFailed) {
          notification = {
            userId: subscription.user.id,
            title: 'Pagamento não concluído',
            message: `Não foi possível concluir o pagamento do plano ${subscription.plan.name}. Podes tentar novamente na plataforma.`,
          };
        }
      }

      if (!persistedPayment.failureEmailQueuedAt && subscription.user.email) {
        mail = {
          to: subscription.user.email,
          template: EmailTemplateType.SUBSCRIPTION_PAYMENT_FAILED,
          context: {
            userName: subscription.user.profile?.fullName,
            planName: subscription.plan.name,
            amount: persistedPayment.amount,
            currency: persistedPayment.currency,
            paymentReference:
              persistedPayment.providerReference ?? `#${persistedPayment.id}`,
          },
        };
      }
      await manager.getRepository(Subscription).save(subscription);
    });
    if (notification) {
      try {
        await this.notificationService.notify(notification);
      } catch (error) {
        this.logger.warn({
          msg: `Não foi possível colocar o aviso de pagamento da subscrição ${subscriptionId} na fila.`,
          action: 'SUBSCRIPTION_NOTIFICATION_QUEUE_ERROR',
          service: 'Subscription',
          data: { subscriptionId },
          error,
        });
      }
    }
    if (mail) {
      const succeeded =
        mail.template === EmailTemplateType.SUBSCRIPTION_PAYMENT_SUCCEEDED;
      await this.mailQueue.add(
        'send_email',
        {
          to: mail.to,
          template: mail.template,
          context: mail.context,
        },
        {
          jobId: `subscription-payment-${succeeded ? 'succeeded' : 'failed'}-${paymentId}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: false,
        },
      );
      await this.dataSource.getRepository(Payment).update(
        {
          id: paymentId,
          [succeeded ? 'successEmailQueuedAt' : 'failureEmailQueuedAt']:
            IsNull(),
        },
        succeeded
          ? { successEmailQueuedAt: new Date() }
          : { failureEmailQueuedAt: new Date() },
      );
    }
  }

  async findOne(id: number, userId: number): Promise<SubscriptionResponseDto> {
    const entity = await this.subscriptions.findOne({
      where: { id, userId },
      relations: { user: true, plan: true, payments: true },
      order: { payments: { id: 'ASC' } },
    });
    if (!entity) throw new NotFoundException('Subscrição não encontrada.');
    return SubscriptionResponseDto.fromEntity(entity);
  }

  async findMine(userId: number): Promise<SubscriptionMeResponseDto> {
    const relations = { plan: true, payments: true } as const;
    const activeSubscription = await this.subscriptions.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations,
      order: { createdAt: 'DESC' },
    });

    const entity =
      activeSubscription ??
      (await this.subscriptions.findOne({
        where: { userId },
        relations,
        order: { createdAt: 'DESC' },
      }));

    return SubscriptionMeResponseDto.fromEntity(entity);
  }
}
