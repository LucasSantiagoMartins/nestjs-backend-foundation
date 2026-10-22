import { Module, Global } from '@nestjs/common';
import { MailProcessor } from './processors/mail.processor';
import { MailTemplateService } from './services/mail-template.service';
import { ConfigModule } from '@nestjs/config';
import resendConfig from '@config/resend.config';

@Global()
@Module({
  imports: [ConfigModule.forFeature(resendConfig)],
  providers: [MailTemplateService, MailProcessor],
  exports: [],
})
export class MailModule {}
