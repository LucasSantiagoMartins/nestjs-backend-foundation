import { SubscriptionService } from '../services/subscription.service';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { BillingPeriod } from '../enums/billing-period.enum';

jest.mock('@nestjs/bullmq', () => ({ InjectQueue: () => () => undefined }));

describe('SubscriptionService payment finalization', () => {
  let service: SubscriptionService;
  let subscription: any;
  let payment: any;
  let mailQueue: { add: jest.Mock };

  beforeEach(() => {
    subscription = {
      id: 7,
      userId: 3,
      status: SubscriptionStatus.PENDING_PAYMENT,
      startedAt: null,
      paymentFailureEmailQueuedAt: null,
      paymentSuccessEmailQueuedAt: null,
      user: { id: 3, email: 'person@example.test' },
      plan: { name: 'Pro' },
    };
    payment = {
      id: 11,
      status: PaymentStatus.FAILED,
      amount: '10.00',
      currency: 'EUR',
      providerReference: null,
      failureEmailQueuedAt: null,
      successEmailQueuedAt: null,
    };
    const subscriptionRepo = {
      findOne: jest.fn().mockResolvedValue(subscription),
      save: jest.fn().mockImplementation(async (value) => value),
      update: jest.fn().mockImplementation(async (_criteria, changes) => {
        Object.assign(subscription, changes);
        return { affected: 1 };
      }),
    };
    const paymentRepo = {
      findOne: jest.fn().mockResolvedValue(payment),
      update: jest.fn().mockImplementation(async (_criteria, changes) => {
        Object.assign(payment, changes);
        return { affected: 1 };
      }),
    };
    const manager = {
      getRepository: (entity: any) =>
        entity.name === 'Subscription' ? subscriptionRepo : paymentRepo,
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
      getRepository: () => paymentRepo,
    };
    const paymentService = {
      findForSubscription: jest.fn().mockResolvedValue(payment),
    };
    mailQueue = { add: jest.fn().mockResolvedValue(undefined) };
    service = new SubscriptionService(
      subscriptionRepo as any,
      {} as any,
      paymentService as any,
      dataSource as any,
      mailQueue as any,
      { notify: jest.fn().mockResolvedValue(undefined) } as any,
      { warn: jest.fn() } as any,
    );
  });

  it('queues one failure email and does not activate the subscription', async () => {
    await service.finalizePayment(7, 11);
    expect(subscription.status).toBe(SubscriptionStatus.PAYMENT_FAILED);
    expect(subscription.startedAt).toBeNull();
    expect(mailQueue.add).toHaveBeenCalledTimes(1);
    await service.finalizePayment(7, 11);
    expect(mailQueue.add).toHaveBeenCalledTimes(1);
  });

  it('activates a successful payment and queues one success email idempotently', async () => {
    payment.status = PaymentStatus.SUCCEEDED;
    await service.finalizePayment(7, 11);
    const startedAt = subscription.startedAt;
    await service.finalizePayment(7, 11);
    expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
    expect(subscription.startedAt).toBe(startedAt);
    expect(mailQueue.add).toHaveBeenCalledTimes(1);
    expect(mailQueue.add).toHaveBeenCalledWith(
      'send_email',
      expect.objectContaining({ template: 'SUBSCRIPTION_PAYMENT_SUCCEEDED' }),
      expect.objectContaining({ jobId: 'subscription-payment-succeeded-11' }),
    );
  });

  it('creates every retry payment under the same failed subscription', async () => {
    const failedSubscription: any = {
      id: 101,
      userId: 25,
      status: SubscriptionStatus.PAYMENT_FAILED,
      startedAt: null,
      plan: { id: 4, name: 'Premium' },
      payments: [],
    };
    const subscriptionRepository: any = {
      findOne: jest.fn().mockResolvedValue(failedSubscription),
      update: jest.fn().mockImplementation(async (_criteria, changes) => {
        Object.assign(failedSubscription, changes);
        return { affected: 1 };
      }),
    };
    const manager = {
      getRepository: () => subscriptionRepository,
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    const paymentService = {
      createPending: jest.fn().mockResolvedValue({ id: 200 }),
      enqueue: jest.fn().mockResolvedValue(undefined),
    };
    const retryService = new SubscriptionService(
      subscriptionRepository,
      {} as any,
      paymentService as any,
      dataSource as any,
      mailQueue as any,
      { notify: jest.fn().mockResolvedValue(undefined) } as any,
      { warn: jest.fn() } as any,
    );

    await retryService.retryPayment(101, 25, {
      paymentMethod: PaymentMethod.STRIPE,
    });
    failedSubscription.status = SubscriptionStatus.PAYMENT_FAILED;
    await retryService.retryPayment(101, 25, {
      paymentMethod: PaymentMethod.STRIPE,
    });

    expect(paymentService.createPending).toHaveBeenCalledTimes(2);
    expect(
      paymentService.createPending.mock.calls.map(([entity]) => entity.id),
    ).toEqual([101, 101]);
    expect(paymentService.enqueue).toHaveBeenCalledTimes(2);
    const lockQueries = subscriptionRepository.findOne.mock.calls
      .map(([options]: [any]) => options)
      .filter((options: any) => options.lock);
    expect(lockQueries).toHaveLength(2);
    expect(lockQueries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          where: { id: 101, userId: 25 },
          lock: { mode: 'pessimistic_write' },
        }),
      ]),
    );
    expect(lockQueries.every((options: any) => !options.relations)).toBe(true);
  });
});

describe('SubscriptionService findMine', () => {
  const createService = (findOne: jest.Mock) =>
    new SubscriptionService(
      { findOne } as any,
      {} as any,
      {} as any,
      {} as any,
      { add: jest.fn() } as any,
      { notify: jest.fn().mockResolvedValue(undefined) } as any,
      { warn: jest.fn() } as any,
    );

  it('returns the active subscription with its latest payment', async () => {
    const activeSubscription = {
      id: 123,
      userId: 25,
      status: SubscriptionStatus.ACTIVE,
      billingPeriod: BillingPeriod.MONTHLY,
      plan: { id: 2, name: 'Premium' },
      payments: [
        { id: 502, status: PaymentStatus.FAILED },
        { id: 503, status: PaymentStatus.SUCCEEDED },
      ],
    };
    const findOne = jest.fn().mockResolvedValue(activeSubscription);
    const service = createService(findOne);

    await expect(service.findMine(25)).resolves.toEqual({
      hasActiveSubscription: true,
      subscription: {
        id: 123,
        status: SubscriptionStatus.ACTIVE,
        billingPeriod: BillingPeriod.MONTHLY,
        plan: { id: 2, name: 'Premium', benefits: [] },
        latestPayment: { id: 503, status: PaymentStatus.SUCCEEDED },
      },
    });
    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 25, status: SubscriptionStatus.ACTIVE },
      }),
    );
  });

  it('returns the most recent subscription and its failed latest payment when none is active', async () => {
    const latestSubscription = {
      id: 123,
      userId: 25,
      status: SubscriptionStatus.PAYMENT_FAILED,
      billingPeriod: BillingPeriod.YEARLY,
      plan: { id: 2, name: 'Premium' },
      payments: [
        { id: 501, status: PaymentStatus.FAILED },
        { id: 503, status: PaymentStatus.FAILED },
        { id: 502, status: PaymentStatus.FAILED },
      ],
    };
    const findOne = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(latestSubscription);
    const service = createService(findOne);

    await expect(service.findMine(25)).resolves.toEqual({
      hasActiveSubscription: false,
      subscription: {
        id: 123,
        status: SubscriptionStatus.PAYMENT_FAILED,
        billingPeriod: BillingPeriod.YEARLY,
        plan: { id: 2, name: 'Premium', benefits: [] },
        latestPayment: { id: 503, status: PaymentStatus.FAILED },
      },
    });
    expect(findOne).toHaveBeenCalledTimes(2);
    expect(findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { userId: 25 },
        order: { createdAt: 'DESC' },
      }),
    );
  });

  it('returns no subscription when the user has none', async () => {
    const findOne = jest.fn().mockResolvedValue(null);
    const service = createService(findOne);

    await expect(service.findMine(25)).resolves.toEqual({
      hasActiveSubscription: false,
      subscription: null,
    });
  });
});
