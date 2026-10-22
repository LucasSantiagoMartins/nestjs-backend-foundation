import { Roles, UserDecorator } from '@backend-foundation/authorization';
import { UserRole } from '@backend-foundation/common';
import { SuccessMessage } from '@backend-foundation/common/decorators/success-message.decorator';
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateHousingBookingRequestDto } from '../dtos/create-housing-booking-request.dto';
import { HousingBookingRequestResponseDto } from '../dtos/housing-booking-request-response.dto';
import { HousingBookingRequestQueryService } from '../services/housing-booking-request-query.service';
import { HousingBookingRequestService } from '../services/housing-booking-request.service';

@Controller('housing-booking-requests')
export class HousingBookingRequestController {
  constructor(
    private readonly housingBookingRequestService: HousingBookingRequestService,
    private readonly housingBookingRequestQueryService: HousingBookingRequestQueryService,
  ) {}

  @Post()
  @Roles(UserRole.USER)
  @SuccessMessage('Pedido de reserva criado com sucesso.')
  async create(
    @UserDecorator('sub') userId: number,
    @Body() dto: CreateHousingBookingRequestDto,
  ): Promise<HousingBookingRequestResponseDto> {
    return this.housingBookingRequestService.create(userId, dto);
  }

  @Get('me')
  @Roles(UserRole.USER)
  async listMine(
    @UserDecorator('sub') userId: number,
  ): Promise<HousingBookingRequestResponseDto[]> {
    return this.housingBookingRequestQueryService.listMine(userId);
  }

  @Get('me/:id')
  @Roles(UserRole.USER)
  async getMineById(
    @UserDecorator('sub') userId: number,
    @Param('id') id: number,
  ): Promise<HousingBookingRequestResponseDto> {
    return this.housingBookingRequestQueryService.findMineById(
      userId,
      Number(id),
    );
  }

  @Patch(':id/cancel')
  @Roles(UserRole.USER)
  @SuccessMessage('Pedido de reserva cancelado com sucesso.')
  async cancel(
    @UserDecorator('sub') userId: number,
    @Param('id') id: number,
  ): Promise<HousingBookingRequestResponseDto> {
    return this.housingBookingRequestService.cancel(userId, Number(id));
  }
}
