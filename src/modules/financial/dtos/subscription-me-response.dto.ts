import { Payment } from '../entities/payment.entity';
import { Subscription } from '../entities/subscription.entity';
import { BillingPeriod } from '../enums/billing-period.enum';

export class SubscriptionMePlanDto {
  id: number;
  name: string;
  benefits: string[];
}

export class SubscriptionMePaymentDto {
  id: number;
  status: string;
  billingPeriod: BillingPeriod;
}

export class SubscriptionMeItemDto {
  id: number;
  status: string;
  plan: SubscriptionMePlanDto;
  latestPayment: SubscriptionMePaymentDto | null;
}

export class SubscriptionMeResponseDto {
  hasActiveSubscription: boolean;
  subscription: SubscriptionMeItemDto | null;

  static fromEntity(entity: Subscription | null): SubscriptionMeResponseDto {
    const hasActiveSubscription = entity?.status === 'ACTIVE';

    return Object.assign(new SubscriptionMeResponseDto(), {
      hasActiveSubscription,
      subscription: entity
        ? Object.assign(new SubscriptionMeItemDto(), {
            id: entity.id,
            status: entity.status,
            billingPeriod: entity.billingPeriod,
            plan: Object.assign(new SubscriptionMePlanDto(), {
              id: entity.plan.id,
              name: entity.plan.name,
              benefits: entity.plan.benefits ?? [],
            }),
            latestPayment: this.latestPayment(entity.payments ?? []),
          })
        : null,
    });
  }

  private static latestPayment(
    payments: Payment[],
  ): SubscriptionMePaymentDto | null {
    const payment = payments.reduce<Payment | null>(
      (latest, current) =>
        !latest || current.id > latest.id ? current : latest,
      null,
    );
    return payment
      ? Object.assign(new SubscriptionMePaymentDto(), {
          id: payment.id,
          status: payment.status,
        })
      : null;
  }
}
