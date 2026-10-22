import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './controllers/notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './services/notification.service';
import { NotificationProcessor } from './processors/notification.processor';
import { PushToken } from './entities/push-token.entity';
import { PushNotificationService } from './services/push-notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, PushToken])],
  controllers: [NotificationsController],
  providers: [
    NotificationService,
    PushNotificationService,
    NotificationGateway,
    NotificationProcessor,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
