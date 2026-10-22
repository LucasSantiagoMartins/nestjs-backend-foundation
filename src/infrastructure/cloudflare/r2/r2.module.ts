import { Module } from '@nestjs/common';
import { r2ClientProvider } from './providers/r2-client.provider';

@Module({
  providers: [r2ClientProvider],
  exports: [r2ClientProvider],
})
export class CloudflareR2Module {}
