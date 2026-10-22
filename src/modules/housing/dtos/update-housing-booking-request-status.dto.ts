import { IsEnum } from 'class-validator';
import { HousingBookingRequestStatus } from '../enums/housing-booking-request-status.enum';

export class UpdateHousingBookingRequestStatusDto {
  @IsEnum(HousingBookingRequestStatus, {
    message: 'Estado do pedido de reserva inválido.',
  })
  status: HousingBookingRequestStatus;
}
