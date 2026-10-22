import { Subscription } from '../entities/subscription.entity';
import { PaymentResponseDto } from './payment-response.dto';
import { BillingPeriod } from '../enums/billing-period.enum';

export class SubscriptionResponseDto {
  id: number;
  userId: number;
  planId: number;
  billingPeriod: BillingPeriod;
  plan: { id: number; name: string; benefits: string[] };
  status: string;
  startedAt: Date | null;
  createdAt: Date;
  payments: PaymentResponseDto[];

  static fromEntity(entity: Subscription): SubscriptionResponseDto {
    return Object.assign(new SubscriptionResponseDto(), {
      id: entity.id,
      userId: entity.userId,
      planId: entity.plan.id,
      billingPeriod: entity.billingPeriod,
      plan: {
        id: entity.plan.id,
        name: entity.plan.name,
        benefits: entity.plan.benefits ?? [],
      },
      status: entity.status,
      startedAt: entity.startedAt,
      createdAt: entity.createdAt,
      payments: (entity.payments ?? []).map((payment) =>
        PaymentResponseDto.fromEntity(payment, entity.id),
      ),
    });
  }
}
