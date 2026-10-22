import { PaginatedDto } from '@backend-foundation/common/dtos/pagination.dto';
import { QUEUES } from '@infra/queue/queue.constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { CreateNotificationDto } from '../dtos/create-notification.dto';
import { NotificationResponseDto } from '../dtos/notification-response.dto';
import { Notification } from '../entities/notification.entity';
import { NotificationGateway } from '../notification.gateway';
import { PushNotificationService } from './push-notification.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue(QUEUES.NOTIFICATIONS) private readonly queue: Queue,
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
    private readonly gateway: NotificationGateway,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async notify(dto: CreateNotificationDto) {
    await this.queue.add('send_notification', dto, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async processNotificationSaveAndEmit(data: CreateNotificationDto) {
    const { userId, title, message } = data;

    const notification = await this.repository.save(
      this.repository.create({
        recipientId: userId,
        title,
        content: message,
      }),
    );

    this.gateway.sendToUser(userId, {
      ...notification,
      metadata: data.metadata,
    });

    await this.pushNotificationService.sendToUser(userId, title, message, {
      notificationId: notification.id.toString(),
      ...(data.metadata ?? {}),
    });

    return notification;
  }

  async getUserNotifications(
    userId: number,
    page: number,
    limit: number,
  ): Promise<PaginatedDto<NotificationResponseDto>> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await this.repository.findAndCount({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
      skip: skip,
      take: limit,
    });

    return {
      items: notifications.map((n) => NotificationResponseDto.fromEntity(n)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(id: string, userId: number) {
    const result = await this.repository.update(
      { id, recipientId: userId },
      { isRead: true, readAt: new Date() },
    );

    if ((result.affected ?? 0) > 0) {
      this.gateway.sendToUser(userId, { id, isRead: true });
    }
  }

  async delete(id: string, userId: number) {
    await this.repository.delete({ id, recipientId: userId });

    this.gateway.sendToUser(userId, { id, type: 'DELETED_CONFIRMATION' });
  }

  async deleteAll(userId: number) {
    await this.repository.delete({ recipientId: userId });
    this.gateway.sendToUser(userId, { type: 'ALL_DELETED_CONFIRMATION' });
  }
}
