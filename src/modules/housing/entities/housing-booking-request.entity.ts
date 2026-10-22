import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HousingListing } from './housing-listing.entity';
import { HousingRoom } from './housing-room.entity';
import { HousingBookingRequestStatus } from '../enums/housing-booking-request-status.enum';
import { HousingPricePeriod } from '../enums/housing-price-period.enum';

@Entity('housing_booking_requests')
export class HousingBookingRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'housing_listing_id' })
  housingListingId: number;

  @ManyToOne(
    () => HousingListing,
    (housingListing) => housingListing.bookingRequests,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'housing_listing_id' })
  housingListing: HousingListing;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'housing_room_id' })
  housingRoomId: number;

  // TODO analisar depois se apago ou seto como null ao apagar o pai
  @ManyToOne(() => HousingRoom, (housingRoom) => housingRoom.bookingRequests, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'housing_room_id' })
  housingRoom: HousingRoom;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'enum', enum: HousingPricePeriod })
  period: HousingPricePeriod;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: HousingBookingRequestStatus,
    default: HousingBookingRequestStatus.PENDING,
  })
  status: HousingBookingRequestStatus;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt?: Date;

  @Column({ name: 'rejected_at', type: 'timestamp', nullable: true })
  rejectedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'released_at', type: 'timestamp', nullable: true })
  releasedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
