import { Public } from '@backend-foundation/authorization';
import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { StripeWebhookService } from '../services/stripe-webhook.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(private readonly stripeWebhook: StripeWebhookService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: true }> {
    if (!signature || !request.rawBody) {
      throw new BadRequestException('Assinatura ou corpo Stripe em falta.');
    }

    await this.stripeWebhook.handleWebhook(signature, request.rawBody);
    return { received: true };
  }
}
