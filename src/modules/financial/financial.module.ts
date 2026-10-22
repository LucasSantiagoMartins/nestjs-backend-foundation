import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanController } from './controllers/plan.controller';
import { SubscriptionController } from './controllers/subscription.controller';
import { Payment } from './entities/payment.entity';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { PaymentProcessor } from './processors/payment-processor';
import { PaymentService } from './services/payment.service';
import { PaymentProcessingService } from './services/payment-processing.service';
import { PlanService } from './services/plan.service';
import { SubscriptionService } from './services/subscription.service';
import { NotificationModule } from '@modules/notification/notification.module';
import { StripeModule } from '@infra/stripe/stripe.module';
import { StripeWebhookController } from './controllers/stripe-webhook.controller';
import { StripeWebhookService } from './services/stripe-webhook.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Payment, Subscription]),
    NotificationModule,
    ConfigModule,
    StripeModule,
  ],
  controllers: [
    PlanController,
    SubscriptionController,
    StripeWebhookController,
  ],
  providers: [
    PlanService,
    PaymentService,
    PaymentProcessingService,
    SubscriptionService,
    StripeWebhookService,
    PaymentProcessor,
  ],
  exports: [PlanService, PaymentService, SubscriptionService],
})
export class FinancialModule {}
