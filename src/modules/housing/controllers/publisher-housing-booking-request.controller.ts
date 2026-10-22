import { Roles, UserDecorator } from '@backend-foundation/authorization';
import { UserRole } from '@backend-foundation/common';
import { SuccessMessage } from '@backend-foundation/common/decorators/success-message.decorator';
import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { HousingBookingRequestResponseDto } from '../dtos/housing-booking-request-response.dto';
import { UpdateHousingBookingRequestStatusDto } from '../dtos/update-housing-booking-request-status.dto';
import { HousingBookingRequestQueryService } from '../services/housing-booking-request-query.service';
import { HousingBookingRequestService } from '../services/housing-booking-request.service';

@Controller('publishers/housing-booking-requests')
export class PublisherHousingBookingRequestController {
  constructor(
    private readonly housingBookingRequestService: HousingBookingRequestService,
    private readonly housingBookingRequestQueryService: HousingBookingRequestQueryService,
  ) {}

  @Get()
  @Roles(UserRole.PUBLISHER)
  async listForPublisher(
    @UserDecorator('sub') userId: number,
  ): Promise<HousingBookingRequestResponseDto[]> {
    return this.housingBookingRequestQueryService.listForPublisher(userId);
  }

  @Get(':id')
  @Roles(UserRole.PUBLISHER)
  async getById(
    @UserDecorator('sub') userId: number,
    @Param('id') id: number,
  ): Promise<HousingBookingRequestResponseDto> {
    return this.housingBookingRequestQueryService.findForPublisher(
      userId,
      Number(id),
    );
  }

  @Patch(':id/status')
  @Roles(UserRole.PUBLISHER)
  @SuccessMessage('Estado do pedido de reserva atualizado com sucesso.')
  async changeStatus(
    @UserDecorator('sub') userId: number,
    @Param('id') id: number,
    @Body() dto: UpdateHousingBookingRequestStatusDto,
  ): Promise<HousingBookingRequestResponseDto> {
    return this.housingBookingRequestService.transition(
      userId,
      Number(id),
      dto.status,
    );
  }
}
