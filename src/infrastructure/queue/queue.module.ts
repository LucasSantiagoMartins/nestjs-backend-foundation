import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { QUEUES } from './queue.constants';
import { createQueueConfig } from './queue.config';

@Global()
@Module({
  imports: [
    ConfigModule,

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createQueueConfig(config),
    }),

    BullModule.registerQueue({
      name: QUEUES.NOTIFICATIONS,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),

    BullModule.registerQueue({
      name: QUEUES.MAIL,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),

    BullModule.registerQueue({
      name: QUEUES.PAYMENT_PROCESSING,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: false,
        removeOnFail: false,
      },
    }),

    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),

    BullBoardModule.forFeature({
      name: QUEUES.NOTIFICATIONS,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUES.MAIL,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUES.PAYMENT_PROCESSING,
      adapter: BullMQAdapter,
    }),
  ],

  exports: [BullModule],
})
export class QueueModule {}
