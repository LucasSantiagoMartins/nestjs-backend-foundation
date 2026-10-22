import { HousingBookingRequest } from '../entities/housing-booking-request.entity';
import { HousingBookingRequestStatus } from '../enums/housing-booking-request-status.enum';
import { HousingPricePeriod } from '../enums/housing-price-period.enum';

export class HousingBookingRequestResponseDto {
  id: number;
  housingListingId: number;
  userId: number;
  housingRoomId?: number;
  quantity: number;
  period: HousingPricePeriod;
  totalPrice: number;
  status: HousingBookingRequestStatus;
  acceptedAt?: Date;
  rejectedAt?: Date;
  cancelledAt?: Date;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(
    entity: HousingBookingRequest,
  ): HousingBookingRequestResponseDto {
    const dto = new HousingBookingRequestResponseDto();
    dto.id = entity.id;
    dto.housingListingId = entity.housingListingId;
    dto.userId = entity.userId;
    dto.housingRoomId = entity.housingRoomId;
    dto.quantity = entity.quantity;
    dto.period = entity.period;
    dto.totalPrice = Number(entity.totalPrice);
    dto.status = entity.status;
    dto.acceptedAt = entity.acceptedAt;
    dto.rejectedAt = entity.rejectedAt;
    dto.cancelledAt = entity.cancelledAt;
    dto.releasedAt = entity.releasedAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
