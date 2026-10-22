import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  app.get(AppLogger).info({
    msg: `Application is running on: http://localhost:${port}`,
    action: 'APPLICATION_STARTED',
    service: 'Bootstrap',
  });
}
bootstrap();
