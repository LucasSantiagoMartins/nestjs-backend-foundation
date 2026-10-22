jest.mock('@nestjs/bullmq', () => ({ InjectQueue: () => () => undefined }));

import { PaymentService } from '../services/payment.service';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { BillingPeriod } from '../enums/billing-period.enum';

describe('PaymentService', () => {
  it('persists a pending payment with the requested method and enqueues processing', async () => {
    const payment = { id: 8, status: PaymentStatus.PENDING };
    const repository: any = {
      create: jest.fn((values) => values),
      save: jest.fn().mockResolvedValue(payment),
    };
    const queue = { add: jest.fn().mockResolvedValue(undefined) };
    const service = new PaymentService(
      repository,
      queue as any,
      { get: jest.fn().mockReturnValue('mock') } as any,
      { createPaymentIntent: jest.fn() } as any,
    );
    const subscription = {
      id: 3,
      billingPeriod: BillingPeriod.MONTHLY,
      plan: { monthlyPrice: '20.00', yearlyPrice: null, currency: 'EUR' },
    } as any;

    await expect(
      service.createAndEnqueue(subscription, PaymentMethod.STRIPE),
    ).resolves.toBe(payment);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription,
        amount: '20.00',
        currency: 'EUR',
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
      }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'process_payment',
      { paymentId: 8 },
      expect.objectContaining({ jobId: 'payment-8' }),
    );
  });

  it('creates a Stripe PaymentIntent and persists its processing details without queueing', async () => {
    const payment = {
      id: 12,
      status: PaymentStatus.PENDING,
      metadata: { provider: 'STRIPE' },
    };
    const repository: any = {
      create: jest.fn((values) => values),
      save: jest.fn(async (value) => value),
      findOne: jest.fn().mockResolvedValue({ ...payment }),
    };
    const queue = { add: jest.fn() };
    const stripeProvider = {
      createPaymentIntent: jest.fn().mockResolvedValue({
        status: PaymentStatus.PROCESSING,
        providerReference: 'pi_test_123',
        metadata: {
          provider: 'STRIPE',
          clientSecret: 'pi_test_123_secret_test',
          publishableKey: 'pk_test_fake',
        },
      }),
    };
    const service = new PaymentService(
      repository,
      queue as any,
      { get: jest.fn().mockReturnValue('stripe') } as any,
      stripeProvider as any,
    );
    const subscription = {
      id: 4,
      userId: 9,
      billingPeriod: BillingPeriod.MONTHLY,
      plan: { monthlyPrice: '20.00', yearlyPrice: null, currency: 'EUR' },
    } as any;
    const createdPayment = {
      ...payment,
      subscription,
      amount: '20.00',
      currency: 'EUR',
      method: PaymentMethod.STRIPE,
    };
    repository.save.mockResolvedValueOnce(createdPayment);
    repository.findOne.mockResolvedValue(createdPayment);

    await expect(
      service.createAndEnqueue(subscription, PaymentMethod.STRIPE),
    ).resolves.toBe(createdPayment);

    expect(stripeProvider.createPaymentIntent).toHaveBeenCalledWith(
      createdPayment,
    );
    expect(createdPayment).toMatchObject({
      status: PaymentStatus.PROCESSING,
      providerReference: 'pi_test_123',
      metadata: {
        provider: 'STRIPE',
        clientSecret: 'pi_test_123_secret_test',
        publishableKey: 'pk_test_fake',
      },
    });
    expect(repository.save).toHaveBeenCalledTimes(2);
    expect(queue.add).not.toHaveBeenCalled();
  });
});
