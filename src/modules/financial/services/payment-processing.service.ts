import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { SubscriptionService } from './subscription.service';

interface PaymentProcessorResult {
  succeeded: boolean;
  providerReference: string | null;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

/** Mock payment integration; outcomes are controllable through PAYMENT_MOCK_OUTCOMES. */
@Injectable()
export class PaymentProcessingService {
  private attempt = 0;
  private readonly outcomes = (
    process.env.PAYMENT_MOCK_OUTCOMES ?? 'success,failure'
  )
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    private readonly subscriptionService: SubscriptionService,
    private readonly logger: AppLogger,
  ) {}

  async processPayment(paymentId: number): Promise<Payment> {
    this.logger.info({
      msg: `Starting payment processing for payment ${paymentId}`,
      action: 'PAYMENT_PROCESS_START',
      service: 'PaymentProcessingService',
      data: { paymentId },
    });

    const payment = await this.payments.findOne({
      where: { id: paymentId },
      relations: { subscription: true },
    });
    if (!payment) {
      this.logger.error({
        msg: `Payment ${paymentId} was not found`,
        action: 'PAYMENT_NOT_FOUND',
        service: 'PaymentProcessingService',
        data: { paymentId },
      });
      throw new NotFoundException('Pagamento não encontrado.');
    }

    this.logger.info({
      msg: `Payment ${paymentId} loaded with status ${payment.status}`,
      action: 'PAYMENT_LOADED',
      service: 'PaymentProcessingService',
      data: {
        paymentId,
        subscriptionId: payment.subscription?.id,
        status: payment.status,
      },
    });

    // A completed payment can be finalized again without calling the provider.
    // This recovers subscription state and email enqueueing after a partial failure.
    if (
      payment.status === PaymentStatus.SUCCEEDED ||
      payment.status === PaymentStatus.FAILED
    ) {
      this.logger.warn({
        msg: `Payment ${paymentId} is already terminal; retrying subscription finalization`,
        action: 'PAYMENT_FINALIZATION_RECOVERY',
        service: 'PaymentProcessingService',
        data: { paymentId, status: payment.status },
      });
      await this.finalizeSubscription(payment);
      return payment;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new ConflictException('Este pagamento já está a ser processado.');
    }

    // Claim the payment atomically so duplicate jobs cannot call the provider concurrently.
    const claimed = await this.payments.update(
      { id: paymentId, status: PaymentStatus.PENDING },
      { status: PaymentStatus.PROCESSING },
    );
    if (!claimed.affected) {
      this.logger.warn({
        msg: `Payment ${paymentId} could not be claimed because its status changed`,
        action: 'PAYMENT_CLAIM_CONFLICT',
        service: 'PaymentProcessingService',
        data: { paymentId },
      });
      throw new ConflictException('Este pagamento já está a ser processado.');
    }

    this.logger.info({
      msg: `Payment ${paymentId} claimed for processing`,
      action: 'PAYMENT_CLAIMED',
      service: 'PaymentProcessingService',
      data: { paymentId, status: PaymentStatus.PROCESSING },
    });

    let result: PaymentProcessorResult;
    try {
      result = await this.processWithMockProvider(payment.id);
    } catch (error) {
      await this.payments.update(
        { id: paymentId, status: PaymentStatus.PROCESSING },
        { status: PaymentStatus.PENDING },
      );
      this.logger.error({
        msg: `Provider processing failed for payment ${paymentId}`,
        action: 'PAYMENT_PROVIDER_ERROR',
        service: 'PaymentProcessingService',
        error: error instanceof Error ? error.message : error,
        rawError: error instanceof Error ? error.stack : undefined,
        data: { paymentId },
      });
      throw error;
    }

    this.logger.info({
      msg: `Provider returned ${result.succeeded ? 'success' : 'failure'} for payment ${paymentId}`,
      action: 'PAYMENT_PROVIDER_RESULT',
      service: 'PaymentProcessingService',
      data: {
        paymentId,
        succeeded: result.succeeded,
        providerReference: result.providerReference,
        failureReason: result.failureReason,
      },
    });

    payment.status = result.succeeded
      ? PaymentStatus.SUCCEEDED
      : PaymentStatus.FAILED;
    payment.providerReference = result.providerReference;
    payment.metadata = {
      ...(payment.metadata ?? {}),
      ...(result.metadata ?? {}),
      ...(result.failureReason ? { failureReason: result.failureReason } : {}),
    };
    payment.processedAt = new Date();
    let processed: Payment;
    try {
      processed = await this.payments.save(payment);
    } catch (error) {
      // If persistence did not complete, make the job claimable again.
      // If it did complete before a connection error, this conditional update is a no-op.
      await this.payments.update(
        { id: paymentId, status: PaymentStatus.PROCESSING },
        { status: PaymentStatus.PENDING },
      );
      this.logger.error({
        msg: `Could not persist processing result for payment ${paymentId}`,
        action: 'PAYMENT_PERSIST_ERROR',
        service: 'PaymentProcessingService',
        error: error instanceof Error ? error.message : error,
        rawError: error instanceof Error ? error.stack : undefined,
        data: { paymentId, attemptedStatus: payment.status },
      });
      throw error;
    }

    this.logger.info({
      msg: `Payment ${paymentId} result persisted as ${processed.status}`,
      action: 'PAYMENT_RESULT_PERSISTED',
      service: 'PaymentProcessingService',
      data: {
        paymentId,
        subscriptionId: payment.subscription.id,
        status: processed.status,
      },
    });

    await this.finalizeSubscription(processed);
    this.logger.info({
      msg: `Payment ${paymentId} processing completed`,
      action: 'PAYMENT_PROCESS_COMPLETED',
      service: 'PaymentProcessingService',
      data: { paymentId, subscriptionId: payment.subscription.id },
    });
    return processed;
  }

  private async finalizeSubscription(payment: Payment): Promise<void> {
    this.logger.info({
      msg: `Finalizing subscription ${payment.subscription.id} for payment ${payment.id}`,
      action: 'SUBSCRIPTION_FINALIZATION_START',
      service: 'PaymentProcessingService',
      data: {
        paymentId: payment.id,
        subscriptionId: payment.subscription.id,
        paymentStatus: payment.status,
      },
    });
    try {
      await this.subscriptionService.finalizePayment(
        payment.subscription.id,
        payment.id,
      );
    } catch (error) {
      this.logger.error({
        msg: `Subscription finalization failed for payment ${payment.id}`,
        action: 'SUBSCRIPTION_FINALIZATION_ERROR',
        service: 'PaymentProcessingService',
        error: error instanceof Error ? error.message : error,
        rawError: error instanceof Error ? error.stack : undefined,
        data: {
          paymentId: payment.id,
          subscriptionId: payment.subscription.id,
          paymentStatus: payment.status,
        },
      });
      throw error;
    }
    this.logger.info({
      msg: `Subscription ${payment.subscription.id} finalized for payment ${payment.id}`,
      action: 'SUBSCRIPTION_FINALIZATION_COMPLETED',
      service: 'PaymentProcessingService',
      data: {
        paymentId: payment.id,
        subscriptionId: payment.subscription.id,
      },
    });
  }

  private async processWithMockProvider(
    paymentId: number,
  ): Promise<PaymentProcessorResult> {
    const outcome =
      this.outcomes[this.attempt++ % this.outcomes.length] ?? 'success';
    if (outcome !== 'success') {
      return {
        succeeded: false,
        providerReference: null,
        failureReason:
          outcome === 'insufficient_funds'
            ? 'Saldo insuficiente.'
            : 'Pagamento recusado pelo fornecedor simulado.',
        metadata: { provider: 'STRIPE_MOCK' },
      };
    }
    return {
      succeeded: true,
      providerReference: `mock_tx_${paymentId}_${this.attempt}`,
      metadata: { provider: 'STRIPE_MOCK' },
    };
  }
}
