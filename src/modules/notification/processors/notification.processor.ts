import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationService } from '../services/notification.service';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { QUEUES } from '@infra/queue/queue.constants';

@Processor(QUEUES.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async process(job: Job<CreateNotificationDto>): Promise<any> {
    try {
      return await this.notificationService.processNotificationSaveAndEmit(
        job.data,
      );
    } catch (error) {
      throw error;
    }
  }
}
