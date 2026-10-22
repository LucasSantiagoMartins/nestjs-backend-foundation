import { Notification } from '../entities/notification.entity';

export class NotificationResponseDto {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;

  static fromEntity(notification: Notification): NotificationResponseDto {
    return Object.assign(new NotificationResponseDto(), {
      id: notification.id,
      title: notification.title,
      content: notification.content,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    });
  }
}
