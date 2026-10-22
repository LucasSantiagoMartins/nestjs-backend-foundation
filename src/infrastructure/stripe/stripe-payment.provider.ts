import { Injectable } from '@nestjs/common';
import { Payment } from '@modules/financial/entities/payment.entity';
import { PaymentStatus } from '@modules/financial/enums/payment-status.enum';
import { StripeService } from './stripe.service';

@Injectable()
export class StripePaymentProvider {
  constructor(private readonly stripeService: StripeService) {}

  async createPaymentIntent(payment: Payment) {
    const subscription = payment.subscription;
    if (!subscription) {
      throw new Error('O pagamento não contém uma subscrição associada.');
    }

    const publishableKey = this.stripeService.getPublishableKey();
    const intent = await this.stripeService.getClient().paymentIntents.create(
      {
        amount: Math.round(Number(payment.amount) * 100),
        currency: payment.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          paymentId: String(payment.id),
          userId: String(subscription.userId),
          referenceType: 'SUBSCRIPTION',
          referenceId: String(subscription.id),
        },
      },
      { idempotencyKey: `payment-${payment.id}` },
    );

    return {
      status: PaymentStatus.PROCESSING,
      providerReference: intent.id,
      metadata: {
        provider: 'STRIPE',
        clientSecret: intent.client_secret,
        publishableKey,
      },
    };
  }
}
