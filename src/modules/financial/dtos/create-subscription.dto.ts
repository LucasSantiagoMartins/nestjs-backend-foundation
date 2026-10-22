import { IsEnum, IsInt, Min } from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';
import { BillingPeriod } from '../enums/billing-period.enum';

export class CreateSubscriptionDto {
  @IsInt({ message: 'O identificador do plano deve ser um número inteiro.' })
  @Min(1)
  planId: number;

  @IsEnum(BillingPeriod, { message: 'O período de faturação é inválido.' })
  billingPeriod: BillingPeriod;

  @IsEnum(PaymentMethod, { message: 'O método de pagamento é inválido.' })
  paymentMethod: PaymentMethod;
}
