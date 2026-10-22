import { ConfigService } from '@nestjs/config';
import { BullRootModuleOptions } from '@nestjs/bullmq';

export function createQueueConfig(
  config: ConfigService,
): BullRootModuleOptions {
  return {
    connection: {
      host: config.getOrThrow<string>('REDIS_HOST'),
      port: config.getOrThrow<number>('REDIS_PORT'),
    },
  };
}
