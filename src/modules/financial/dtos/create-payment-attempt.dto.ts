import { IsEnum } from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';

export class CreatePaymentAttemptDto {
  @IsEnum(PaymentMethod, { message: 'O método de pagamento é inválido.' })
  paymentMethod: PaymentMethod;
}
