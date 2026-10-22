jest.mock('@nestjs/bullmq', () => ({
  Processor: () => (target: any) => target,
  OnWorkerEvent: () => () => undefined,
  WorkerHost: class {},
  InjectQueue: () => () => undefined,
}));

import { PaymentProcessor } from '../processors/payment-processor';

describe('PaymentProcessor', () => {
  it('passes the queued payment id to PaymentProcessingService', async () => {
    const processingService = {
      processPayment: jest.fn().mockResolvedValue({ id: 8 }),
    };
    const processor = new PaymentProcessor(
      processingService as any,
      { info: jest.fn(), error: jest.fn() } as any,
    );

    await expect(
      processor.process({
        id: 'job-8',
        name: 'process_payment',
        data: { paymentId: 8 },
        attemptsMade: 0,
        opts: { attempts: 3 },
      } as any),
    ).resolves.toEqual({ id: 8 });
    expect(processingService.processPayment).toHaveBeenCalledWith(8);
  });
});
