import { BadRequestException } from '@nestjs/common';
import { StripeWebhookService } from '../services/stripe-webhook.service';
import { PaymentStatus } from '../enums/payment-status.enum';

describe('StripeWebhookService', () => {
  const rawBody = Buffer.from('{"type":"test"}');
  let payment: any;
  let constructEvent: jest.Mock;
  let payments: any;
  let subscriptions: any;
  let service: StripeWebhookService;

  beforeEach(() => {
    payment = {
      id: 12,
      status: PaymentStatus.PROCESSING,
      providerReference: 'pi_test_123',
      metadata: { provider: 'STRIPE' },
      subscription: { id: 4 },
    };
    constructEvent = jest.fn();
    payments = {
      findOne: jest.fn().mockResolvedValue(payment),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    subscriptions = { finalizePayment: jest.fn().mockResolvedValue(undefined) };
    service = new StripeWebhookService(
      payments,
      {
        getClient: () => ({ webhooks: { constructEvent } }),
        getWebhookSecret: () => 'whsec_test_fake',
      } as any,
      subscriptions,
    );
  });

  it('marks a successful payment and finalizes its subscription', async () => {
    constructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: {
        object: { id: 'pi_test_123', metadata: { paymentId: '12' } },
      },
    });

    await service.handleWebhook('signature', rawBody);

    expect(constructEvent).toHaveBeenCalledWith(
      rawBody,
      'signature',
      'whsec_test_fake',
    );
    expect(payment).toMatchObject({
      status: PaymentStatus.SUCCEEDED,
      providerReference: 'pi_test_123',
      metadata: { provider: 'STRIPE' },
    });
    expect(payment.processedAt).toBeInstanceOf(Date);
    expect(payments.save).toHaveBeenCalledWith(payment);
    expect(subscriptions.finalizePayment).toHaveBeenCalledWith(4, 12);
  });

  it('marks a failed payment with its failure reason and finalizes it', async () => {
    constructEvent.mockReturnValue({
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_test_123',
          metadata: { paymentId: '12' },
          last_payment_error: { message: 'Card declined' },
        },
      },
    });

    await service.handleWebhook('signature', rawBody);

    expect(payment).toMatchObject({
      status: PaymentStatus.FAILED,
      metadata: { provider: 'STRIPE', failureReason: 'Card declined' },
    });
    expect(payments.save).toHaveBeenCalledWith(payment);
    expect(subscriptions.finalizePayment).toHaveBeenCalledWith(4, 12);
  });

  it('rejects an invalid signature without changing the payment', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    await expect(service.handleWebhook('invalid', rawBody)).rejects.toThrow(
      BadRequestException,
    );

    expect(payments.findOne).not.toHaveBeenCalled();
    expect(payments.save).not.toHaveBeenCalled();
    expect(subscriptions.finalizePayment).not.toHaveBeenCalled();
  });

  it('ignores event types outside the payment flow', async () => {
    constructEvent.mockReturnValue({ type: 'customer.updated' });

    await expect(
      service.handleWebhook('signature', rawBody),
    ).resolves.toBeUndefined();

    expect(payments.findOne).not.toHaveBeenCalled();
  });
});
