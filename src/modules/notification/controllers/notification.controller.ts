import { UserDecorator } from '@backend-foundation/authorization';
import { SuccessMessage } from '@backend-foundation/common';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RegisterPushTokenDto } from '../dtos/register-push-token.dto';
import { NotificationService } from '../services/notification.service';
import { PushNotificationService } from '../services/push-notification.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Get()
  @SuccessMessage('Notificações carregadas com sucesso')
  findAll(
    @UserDecorator('sub') userId: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.service.getUserNotifications(
      Number(userId),
      Number(page),
      Number(limit),
    );
  }

  @Post('push-token')
  @SuccessMessage('Token de push registrado com sucesso')
  async registerPushToken(
    @UserDecorator('sub') userId: number,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushNotificationService.registerToken(Number(userId), dto);
  }

  @Patch(':id/read')
  @SuccessMessage('Marcada como lida com sucesso')
  async read(@Param('id') id: string, @UserDecorator('sub') userId: number) {
    return this.service.markAsRead(id, userId);
  }

  @Delete('all')
  @SuccessMessage('Todas as notificações foram removidas')
  async deleteAll(@UserDecorator('sub') userId: number) {
    return this.service.deleteAll(userId);
  }

  @Delete(':id')
  @SuccessMessage('Notificação removida com sucesso')
  async remove(@Param('id') id: string, @UserDecorator('sub') userId: number) {
    return this.service.delete(id, userId);
  }
}
