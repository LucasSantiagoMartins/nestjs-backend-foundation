import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripePaymentProvider } from './stripe-payment.provider';
import { StripeService } from './stripe.service';

@Module({
  imports: [ConfigModule],
  providers: [StripeService, StripePaymentProvider],
  exports: [StripeService, StripePaymentProvider],
})
export class StripeModule {}
