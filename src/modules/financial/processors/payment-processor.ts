import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { QUEUES } from '@infra/queue/queue.constants';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PaymentProcessingService } from '../services/payment-processing.service';

interface ProcessPaymentJob {
  paymentId: number;
}

@Processor(QUEUES.PAYMENT_PROCESSING)
export class PaymentProcessor extends WorkerHost {
  constructor(
    private readonly paymentProcessingService: PaymentProcessingService,
    private readonly logger: AppLogger,
  ) {
    super();
  }

  async process(job: Job<ProcessPaymentJob>) {
    const paymentId = job.data.paymentId;
    this.logger.info({
      msg: `Payment job ${job.id} started`,
      action: 'PAYMENT_JOB_START',
      service: 'PaymentProcessor',
      data: {
        jobId: job.id,
        jobName: job.name,
        paymentId,
        attempt: job.attemptsMade + 1,
        maxAttempts: job.opts.attempts,
      },
    });
    try {
      return await this.paymentProcessingService.processPayment(paymentId);
    } catch (error) {
      this.logger.error({
        msg: `Payment job ${job.id} attempt ${job.attemptsMade + 1} failed`,
        action: 'PAYMENT_JOB_PROCESS_ERROR',
        service: 'PaymentProcessor',
        error: error instanceof Error ? error.message : error,
        rawError: error instanceof Error ? error.stack : undefined,
        data: {
          jobId: job.id,
          paymentId,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts,
        },
      });
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ProcessPaymentJob>) {
    this.logger.info({
      msg: `Payment job ${job.id} completed`,
      action: 'PAYMENT_JOB_COMPLETED',
      service: 'PaymentProcessor',
      data: { jobId: job.id, paymentId: job.data.paymentId },
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ProcessPaymentJob>, error: Error) {
    this.logger.error({
      msg: `Payment job ${job.id} attempt ${job.attemptsMade} failed`,
      action: 'PAYMENT_JOB_ATTEMPT_FAILED',
      service: 'PaymentProcessor',
      error: error.message,
      rawError: error.stack,
      data: {
        jobId: job.id,
        paymentId: job.data.paymentId,
        attemptsMade: job.attemptsMade,
      },
    });
  }
}
