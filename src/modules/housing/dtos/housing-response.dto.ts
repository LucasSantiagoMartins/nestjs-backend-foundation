import { Currency } from '@backend-foundation/common/enums/currency.enum';
import { HousingListing } from '../entities/housing-listing.entity';
import { PropertyType } from '../enums/property-type.enum';
import { AccommodationType } from '../enums/accommodation-type.enum';
import { HousingPricePeriod } from '../enums/housing-price-period.enum';
import { HousingListingStatus } from '../enums/housing-listing-status.enum';
import { HousingRoomResponseDto } from './housing-room-response.dto';

export class HousingResponseDto {
  id: number;
  title: string;
  description: string;
  status: HousingListingStatus;
  propertyType?: PropertyType;
  accommodationType?: AccommodationType;
  municipality?: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
  price?: number;
  priceCurrency: Currency;
  pricePeriod?: HousingPricePeriod;
  availableRooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  imageUrls?: string[];
  rooms?: HousingRoomResponseDto[];
  publishedAt?: Date;
  expiresAt: Date | null;

  static fromEntity(entity: HousingListing): HousingResponseDto {
    const dto = new HousingResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.status = entity.status;
    dto.propertyType = entity.propertyType as any;
    dto.accommodationType = entity.accommodationType as any;
    dto.municipality = entity.municipality;
    dto.addressLine = entity.addressLine;
    dto.latitude = entity.latitude as any;
    dto.longitude = entity.longitude as any;
    dto.price = entity.price as any;
    dto.priceCurrency = entity.priceCurrency;
    dto.pricePeriod = entity.pricePeriod as any;
    dto.availableRooms = entity.availableRooms ?? 0;
    dto.bedrooms = entity.bedrooms;
    dto.bathrooms = entity.bathrooms;
    dto.imageUrls = entity.imageUrls;
    dto.rooms = entity.rooms?.map((room) =>
      HousingRoomResponseDto.fromEntity(room),
    );
    dto.publishedAt = entity.publishedAt;
    dto.expiresAt = entity.expiresAt;
    return dto;
  }
}
