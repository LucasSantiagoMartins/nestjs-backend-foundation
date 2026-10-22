import { Inject } from '@nestjs/common';

export const InjectQueue =
  (queueName: string): ParameterDecorator => Inject(getQueueToken(queueName));

export const getQueueToken = (queueName: string): string =>
  `BullQueue_${queueName}`;
