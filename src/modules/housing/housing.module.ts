import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HousingListing } from './entities/housing-listing.entity';
import { HousingRoom } from './entities/housing-room.entity';
import { HousingBookingRequest } from './entities/housing-booking-request.entity';
import { HousingService } from './services/housing.service';
import { HousingQueryService } from './services/housing-query.service';
import { HousingBookingRequestService } from './services/housing-booking-request.service';
import { HousingBookingRequestQueryService } from './services/housing-booking-request-query.service';
import { HousingController } from './controllers/housing.controller';
import { PublisherHousingController } from './controllers/publisher-housing.controller';
import { HousingBookingRequestController } from './controllers/housing-booking-request.controller';
import { PublisherHousingBookingRequestController } from './controllers/publisher-housing-booking-request.controller';
import { UploadModule } from '@modules/upload/upload.module';
import { User } from '@modules/user/entities/user.entity';
import { NotificationModule } from '@modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HousingListing,
      HousingRoom,
      HousingBookingRequest,
      User,
    ]),
    UploadModule,
    NotificationModule,
  ],
  controllers: [
    HousingController,
    PublisherHousingController,
    HousingBookingRequestController,
    PublisherHousingBookingRequestController,
  ],
  providers: [
    HousingService,
    HousingQueryService,
    HousingBookingRequestService,
    HousingBookingRequestQueryService,
  ],
  exports: [
    HousingService,
    HousingQueryService,
    HousingBookingRequestService,
    HousingBookingRequestQueryService,
  ],
})
export class HousingModule {}
