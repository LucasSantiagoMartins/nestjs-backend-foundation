import { Payment } from '../entities/payment.entity';

export class PaymentResponseDto {
  id: number;
  subscriptionId: number;
  amount: string;
  currency: string;
  method: string;
  status: string;
  failureReason: string | null;
  providerReference: string | null;
  processedAt: Date | null;
  createdAt: Date;

  static fromEntity(
    payment: Payment,
    subscriptionId?: number,
  ): PaymentResponseDto {
    return Object.assign(new PaymentResponseDto(), {
      id: payment.id,
      subscriptionId: subscriptionId ?? payment.subscription?.id,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      failureReason:
        typeof payment.metadata?.failureReason === 'string'
          ? payment.metadata.failureReason
          : null,
      providerReference: payment.providerReference,
      processedAt: payment.processedAt,
      createdAt: payment.createdAt,
    });
  }
}
