import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { StripeService } from '@infra/stripe/stripe.service';
import { Payment } from '../entities/payment.entity';
import { PaymentStatus } from '../enums/payment-status.enum';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class StripeWebhookService {
  constructor(
    @InjectRepository(Payment)
    private readonly payments: Repository<Payment>,
    private readonly stripeService: StripeService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  async handleWebhook(signature: string, rawBody: Buffer): Promise<void> {
    const stripe = this.stripeService.getClient();
    const webhookSecret = this.stripeService.getWebhookSecret();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Assinatura do webhook Stripe inválida.');
    }

    if (
      event.type !== 'payment_intent.succeeded' &&
      event.type !== 'payment_intent.payment_failed'
    ) {
      return;
    }

    const intent = event.data.object as Stripe.PaymentIntent;
    const paymentId = Number(intent.metadata.paymentId);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      throw new BadRequestException(
        'O webhook não contém um pagamento válido.',
      );
    }

    const payment = await this.payments.findOne({
      where: { id: paymentId },
      relations: { subscription: true },
    });
    if (!payment) {
      throw new BadRequestException('Pagamento associado não encontrado.');
    }

    if (payment.providerReference && payment.providerReference !== intent.id) {
      throw new BadRequestException(
        'O PaymentIntent não corresponde ao pagamento.',
      );
    }

    const succeeded = event.type === 'payment_intent.succeeded';
    if (payment.status !== PaymentStatus.SUCCEEDED) {
      if (succeeded || payment.status !== PaymentStatus.FAILED) {
        payment.status = succeeded
          ? PaymentStatus.SUCCEEDED
          : PaymentStatus.FAILED;
        payment.providerReference = intent.id;
        payment.metadata = {
          ...(payment.metadata ?? {}),
          provider: 'STRIPE',
          ...(succeeded
            ? {}
            : { failureReason: intent.last_payment_error?.message ?? null }),
        };
        payment.processedAt = new Date();
        await this.payments.save(payment);
      }
    }

    if (
      payment.status === PaymentStatus.SUCCEEDED ||
      payment.status === PaymentStatus.FAILED
    ) {
      await this.subscriptions.finalizePayment(
        payment.subscription.id,
        payment.id,
      );
    }
  }
}
