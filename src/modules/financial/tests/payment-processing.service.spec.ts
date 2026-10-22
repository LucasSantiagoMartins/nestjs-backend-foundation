jest.mock('@nestjs/bullmq', () => ({ InjectQueue: () => () => undefined }));

import { PaymentProcessingService } from '../services/payment-processing.service';
import { PaymentStatus } from '../enums/payment-status.enum';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

describe('PaymentProcessingService same-subscription attempts', () => {
  const originalOutcomes = process.env.PAYMENT_MOCK_OUTCOMES;

  afterEach(() => {
    if (originalOutcomes === undefined) {
      delete process.env.PAYMENT_MOCK_OUTCOMES;
    } else {
      process.env.PAYMENT_MOCK_OUTCOMES = originalOutcomes;
    }
  });

  it('keeps each failure and activates the subscription on the successful third payment', async () => {
    process.env.PAYMENT_MOCK_OUTCOMES = 'insufficient_funds,declined,success';
    const subscription = {
      id: 101,
      status: SubscriptionStatus.PENDING_PAYMENT,
    };
    const payments = new Map<number, any>([
      [501, { id: 501, status: PaymentStatus.PENDING, subscription }],
      [502, { id: 502, status: PaymentStatus.PENDING, subscription }],
      [503, { id: 503, status: PaymentStatus.PENDING, subscription }],
    ]);
    const repository = {
      findOne: jest.fn(
        async ({ where }: any) => payments.get(where.id) ?? null,
      ),
      update: jest.fn(async ({ id, status }: any, changes: any) => {
        const payment = payments.get(id);
        if (!payment || payment.status !== status) return { affected: 0 };
        Object.assign(payment, changes);
        return { affected: 1 };
      }),
      save: jest.fn(async (payment: any) => {
        payments.set(payment.id, payment);
        return payment;
      }),
    };
    const finalizedPayments: number[] = [];
    const subscriptionService = {
      finalizePayment: jest.fn(
        async (subscriptionId: number, paymentId: number) => {
          expect(subscriptionId).toBe(101);
          finalizedPayments.push(paymentId);
          const payment = payments.get(paymentId);
          subscription.status =
            payment.status === PaymentStatus.SUCCEEDED
              ? SubscriptionStatus.ACTIVE
              : SubscriptionStatus.PAYMENT_FAILED;
        },
      ),
    };
    const service = new PaymentProcessingService(
      repository as any,
      subscriptionService as any,
      { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any,
    );

    await service.processPayment(501);
    await service.processPayment(502);
    await service.processPayment(503);

    expect([...payments.values()].map((payment) => payment.status)).toEqual([
      PaymentStatus.FAILED,
      PaymentStatus.FAILED,
      PaymentStatus.SUCCEEDED,
    ]);
    expect(payments.get(501).metadata.failureReason).toBe(
      'Saldo insuficiente.',
    );
    expect(payments.get(502).metadata.failureReason).toBe(
      'Pagamento recusado pelo fornecedor simulado.',
    );
    expect(finalizedPayments).toEqual([501, 502, 503]);
    expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
  });
});
