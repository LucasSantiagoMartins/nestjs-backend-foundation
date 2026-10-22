import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FirebaseService } from '../../../infrastructure/firebase/services/firebase.service';
import { RegisterPushTokenDto } from '../dtos/register-push-token.dto';
import { PushToken } from '../entities/push-token.entity';

@Injectable()
export class PushNotificationService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly logger: AppLogger,
    @InjectRepository(PushToken)
    private readonly pushTokenRepository: Repository<PushToken>,
  ) {}

  async registerToken(userId: number, data: RegisterPushTokenDto) {
    const existing = await this.pushTokenRepository.findOne({
      where: {
        token: data.token,
      },
    });

    if (existing) {
      return existing;
    }

    return this.pushTokenRepository.save({
      userId,
      token: data.token,
      platform: data.platform,
    });
  }

  async sendToUser(
    userId: number,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    try {
      const tokens = await this.pushTokenRepository.find({
        where: {
          userId,
        },
      });

      for (const tokenData of tokens) {
        try {
          await this.firebaseService.sendPush(
            tokenData.token,
            title,
            body,
            data,
          );
        } catch (error: any) {
          this.logger.error({
            msg: 'Failed to send push notification',
            action: 'PUSH_SEND_ERROR',
            service: 'Push',
            userId,
            error: error?.message || error,
            data: {
              pushTokenId: tokenData.id,
              firebaseCode: error?.errorInfo?.code,
            },
          });

          if (
            error?.errorInfo?.code ===
            'messaging/registration-token-not-registered'
          ) {
            try {
              await this.pushTokenRepository.delete({
                id: tokenData.id,
              });

              this.logger.info({
                msg: 'Invalid push token removed',
                action: 'PUSH_TOKEN_REMOVED',
                service: 'Push',
                userId,
                data: {
                  pushTokenId: tokenData.id,
                },
              });
            } catch (deleteError: any) {
              this.logger.error({
                msg: 'Failed to remove invalid push token',
                action: 'PUSH_TOKEN_REMOVE_ERROR',
                service: 'Push',
                userId,
                error: deleteError?.message || deleteError,
                data: {
                  pushTokenId: tokenData.id,
                },
              });
            }
          }
        }
      }
    } catch (error: any) {
      this.logger.error({
        msg: 'Unexpected error while sending push notifications',
        action: 'PUSH_SERVICE_ERROR',
        service: 'Push',
        userId,
        error: error?.message || error,
      });
    }
  }
}
