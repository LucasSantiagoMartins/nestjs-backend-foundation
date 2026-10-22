import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppLogger } from './logger.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('NODE_ENV') === 'production';
        const ingestUrl = configService.get<string>('BETTER_STACK_INGEST_URL');
        const token = configService.get<string>('BETTER_STACK_TOKEN');

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            autoLogging: false,
            quietReqLogger: true,
            stream: isProduction
              ? {
                  write: (msg: string) => {
                    if (!ingestUrl || !token) return;

                    fetch(ingestUrl, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        message: msg,
                        timestamp: new Date().toISOString(),
                      }),
                    }).catch(() => {});
                  },
                }
              : undefined,
          },
        };
      },
    }),
  ],
  providers: [AppLogger],
  exports: [AppLogger],
})
export class AppLoggerModule {}
