import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe | null;

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('stripe.secretKey');
    this.stripe = secretKey
      ? new Stripe(secretKey, {
          apiVersion: this.config.get<string>(
            'stripe.apiVersion',
          ) as Stripe.LatestApiVersion,
        })
      : null;
  }

  getClient(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'A integração Stripe não está configurada.',
      );
    }

    return this.stripe;
  }

  getWebhookSecret(): string {
    const secret = this.config.get<string>('stripe.webhookSecret');
    if (!secret) {
      throw new ServiceUnavailableException(
        'O webhook Stripe não está configurado.',
      );
    }

    return secret;
  }

  getPublishableKey(): string {
    const key = this.config.get<string>('stripe.publishableKey');
    if (!key) {
      throw new ServiceUnavailableException(
        'A chave pública Stripe não está configurada.',
      );
    }

    return key;
  }
}
