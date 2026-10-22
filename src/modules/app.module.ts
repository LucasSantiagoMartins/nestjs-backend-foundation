import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthorizationModule } from '@backend-foundation/authorization';

import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

import {
  GlobalExceptionFilter,
  ResponseInterceptor,
} from '@backend-foundation/common';
import { AppLoggerModule } from '@backend-foundation/common/logger/logger.module';
import { FirebaseModule } from '@infra/firebase/firebase.module';
import { MailModule } from '@infra/mail/mail.module';
import { QueueModule } from '@infra/queue/queue.module';
import { ScheduleModule } from '@nestjs/schedule';
import googleConfig from 'src/config/google.config';
import r2Config from 'src/config/r2.config';
import stripeConfig from 'src/config/stripe.config';
import { AssistantModule } from './assistant/assistant.module';
import { CommunityModule } from './community/community.module';
import { FinancialModule } from './financial/financial.module';
import { HousingModule } from './housing/housing.module';
import { JobModule } from './job/job.module';
import { NotificationModule } from './notification/notification.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env' : '.env.dev',
      load: [googleConfig, r2Config, stripeConfig],
    }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        type: 'postgres',

        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),

        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),

        autoLoadEntities: true,

        entities: [__dirname + '/**/*.entity{.ts,.js}'],

        synchronize: true,
      }),
    }),

    AuthorizationModule,
    AuthModule,
    UserModule,
    HousingModule,
    JobModule,
    CommunityModule,
    UploadModule,
    FirebaseModule,
    NotificationModule,
    QueueModule,
    AssistantModule,
    FinancialModule,
    AppLoggerModule,
    MailModule,
  ],

  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          transform: true,
        }),
    },

    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
