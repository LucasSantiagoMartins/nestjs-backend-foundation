import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { EntityManager, Repository } from 'typeorm';
import { QUEUES } from '@infra/queue/queue.constants';
import { Subscription } from '../entities/subscription.entity';
import { Payment } from '../entities/payment.entity';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { StripePaymentProvider } from '@infra/stripe/stripe-payment.provider';
import { BillingPeriod } from '../enums/billing-period.enum';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectQueue(QUEUES.PAYMENT_PROCESSING)
    private readonly paymentQueue: Queue,
    private readonly config: ConfigService,
    private readonly stripeProvider: StripePaymentProvider,
  ) {}

  async createAndEnqueue(
    subscription: Subscription,
    paymentMethod: PaymentMethod,
  ): Promise<Payment> {
    const payment = await this.createPending(subscription, paymentMethod);
    await this.enqueue(payment);
    return payment;
  }

  async createPending(
    subscription: Subscription,
    paymentMethod: PaymentMethod,
    manager?: EntityManager,
  ): Promise<Payment> {
    const repository = manager?.getRepository(Payment) ?? this.payments;
    const amount =
      subscription.billingPeriod === BillingPeriod.MONTHLY
        ? subscription.plan.monthlyPrice
        : subscription.plan.yearlyPrice;
    if (amount == null) {
      throw new BadRequestException(
        'Este plano não tem preço anual configurado.',
      );
    }
    return repository.save(
      repository.create({
        subscription,
        amount,
        currency: subscription.plan.currency,
        method: paymentMethod,
        status: PaymentStatus.PENDING,
        providerReference: null,
        metadata: {
          provider:
            this.config.get<string>('stripe.paymentProvider', 'mock') ===
            'stripe'
              ? 'STRIPE'
              : 'STRIPE_MOCK',
        },
        failureEmailQueuedAt: null,
        successEmailQueuedAt: null,
        processedAt: null,
      }),
    );
  }

  async enqueue(payment: Payment): Promise<void> {
    const provider = this.config.get<string>('stripe.paymentProvider', 'mock');
    if (provider === 'stripe') {
      const result = await this.stripeProvider.createPaymentIntent(payment);
      const current = await this.payments.findOne({
        where: { id: payment.id },
      });
      if (
        current?.status === PaymentStatus.SUCCEEDED ||
        current?.status === PaymentStatus.FAILED
      ) {
        return;
      }

      payment.status = result.status;
      payment.providerReference = result.providerReference;
      payment.metadata = { ...(payment.metadata ?? {}), ...result.metadata };
      await this.payments.save(payment);
      return;
    }

    if (provider !== 'mock') {
      throw new Error(`Payment provider não suportado: ${provider}`);
    }

    await this.paymentQueue.add(
      'process_payment',
      { paymentId: payment.id },
      {
        jobId: `payment-${payment.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
  }

  async findForSubscription(
    subscriptionId: number,
    paymentId: number,
  ): Promise<Payment> {
    const payment = await this.payments.findOne({
      where: { id: paymentId, subscription: { id: subscriptionId } },
      relations: { subscription: true },
    });
    if (!payment) {
      throw new NotFoundException(
        'Pagamento não encontrado para esta subscrição.',
      );
    }
    return payment;
  }
}
