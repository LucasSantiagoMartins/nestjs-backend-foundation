import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? 'mock').toLowerCase(),
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  apiVersion: process.env.STRIPE_API_VERSION ?? '2026-06-24.dahlia',
}));
