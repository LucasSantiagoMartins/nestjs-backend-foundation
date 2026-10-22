import { UserDecorator } from '@backend-foundation/authorization/decorators/user.decorator';
import { SuccessMessage } from '@backend-foundation/common/decorators/success-message.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CreatePaymentAttemptDto } from '../dtos/create-payment-attempt.dto';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { SubscriptionMeResponseDto } from '../dtos/subscription-me-response.dto';
import { SubscriptionResponseDto } from '../dtos/subscription-response.dto';
import { SubscriptionService } from '../services/subscription.service';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptions: SubscriptionService) {}

  @Post()
  @SuccessMessage('Subscrição solicitada com sucesso.')
  create(
    @UserDecorator('sub') userId: number,
    @Body() dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptions.create(userId, dto);
  }

  @Post(':id/retry')
  retryPayment(
    @UserDecorator('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePaymentAttemptDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptions.retryPayment(id, userId, dto);
  }

  @Get('me')
  findMine(
    @UserDecorator('sub') userId: number,
  ): Promise<SubscriptionMeResponseDto> {
    return this.subscriptions.findMine(userId);
  }

  @Get(':id')
  findOne(
    @UserDecorator('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptions.findOne(id, userId);
  }
}
