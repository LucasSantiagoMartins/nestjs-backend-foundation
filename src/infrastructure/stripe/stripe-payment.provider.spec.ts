import { StripePaymentProvider } from './stripe-payment.provider';
import { PaymentStatus } from '@modules/financial/enums/payment-status.enum';

describe('StripePaymentProvider', () => {
  it('builds an idempotent PaymentIntent request using the payment data', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret_test',
    });
    const stripeService = {
      getPublishableKey: jest.fn().mockReturnValue('pk_test_fake'),
      getClient: jest.fn().mockReturnValue({ paymentIntents: { create } }),
    };
    const provider = new StripePaymentProvider(stripeService as any);
    const payment = {
      id: 12,
      amount: '20.00',
      currency: 'EUR',
      subscription: { id: 4, userId: 9 },
    } as any;

    await expect(provider.createPaymentIntent(payment)).resolves.toEqual({
      status: PaymentStatus.PROCESSING,
      providerReference: 'pi_test_123',
      metadata: {
        provider: 'STRIPE',
        clientSecret: 'pi_test_123_secret_test',
        publishableKey: 'pk_test_fake',
      },
    });
    expect(create).toHaveBeenCalledWith(
      {
        amount: 2000,
        currency: 'eur',
        automatic_payment_methods: { enabled: true },
        metadata: {
          paymentId: '12',
          userId: '9',
          referenceType: 'SUBSCRIPTION',
          referenceId: '4',
        },
      },
      { idempotencyKey: 'payment-12' },
    );
  });
});
