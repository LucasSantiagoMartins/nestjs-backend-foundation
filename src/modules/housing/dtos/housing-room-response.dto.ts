import { HousingRoom } from '../entities/housing-room.entity';

export class HousingRoomResponseDto {
  id: number;
  housingListingId: number;
  roomNumber: number;
  reserved: boolean;
  description?: string;
  imageUrls?: string[];

  static fromEntity(entity: HousingRoom): HousingRoomResponseDto {
    const dto = new HousingRoomResponseDto();
    dto.id = entity.id;
    dto.housingListingId = entity.housingListingId;
    dto.roomNumber = entity.roomNumber;
    dto.reserved = entity.reserved ?? false;
    dto.description = entity.description;
    dto.imageUrls = entity.imageUrls;
    return dto;
  }
}
