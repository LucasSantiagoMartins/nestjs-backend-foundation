import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { HousingBookingRequest } from './housing-booking-request.entity';
import { HousingListing } from './housing-listing.entity';

@Entity('housing_rooms')
@Unique(['housingListingId', 'roomNumber'])
export class HousingRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'housing_listing_id' })
  housingListingId: number;

  @ManyToOne(() => HousingListing, (housingListing) => housingListing.rooms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'housing_listing_id' })
  housingListing: HousingListing;

  @Column({ name: 'room_number', type: 'int' })
  roomNumber: number;

  @Column({ type: 'boolean', default: false })
  reserved: boolean;

  @OneToMany(
    () => HousingBookingRequest,
    (bookingRequest) => bookingRequest.housingRoom,
  )
  bookingRequests?: HousingBookingRequest[];

  markAsReserved(): boolean {
    if (this.reserved) {
      return false;
    }

    this.reserved = true;
    return true;
  }

  releaseReservation(): boolean {
    if (!this.reserved) {
      return false;
    }

    this.reserved = false;
    return true;
  }

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', array: true, nullable: true })
  imageUrls?: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
