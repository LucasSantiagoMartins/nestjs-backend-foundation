import { IsIn } from 'class-validator';
import { HousingListingStatus } from '../enums/housing-listing-status.enum';

export class UpdateHousingStatusDto {
  @IsIn([HousingListingStatus.PAUSED, HousingListingStatus.CLOSED], {
    message: 'Estado do alojamento inválido.',
  })
  status: HousingListingStatus.PAUSED | HousingListingStatus.CLOSED;
}
