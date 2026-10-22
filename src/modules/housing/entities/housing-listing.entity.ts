import { Currency } from '@backend-foundation/common/enums/currency.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HousingListingStatus } from '../enums/housing-listing-status.enum';
import { PropertyType } from '../enums/property-type.enum';
import { AccommodationType } from '../enums/accommodation-type.enum';
import { HousingPricePeriod } from '../enums/housing-price-period.enum';
import { HousingBookingRequest } from './housing-booking-request.entity';
import { HousingRoom } from './housing-room.entity';

@Entity('housing_listings')
export class HousingListing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'publisher_id' })
  publisherId: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: HousingListingStatus,
    default: HousingListingStatus.PUBLISHED,
  })
  status: HousingListingStatus;

  @Column({ type: 'enum', enum: PropertyType, nullable: true })
  propertyType?: PropertyType;

  @Column({ type: 'enum', enum: AccommodationType, nullable: true })
  accommodationType?: AccommodationType;

  @Column({ nullable: true })
  municipality?: string;

  @Column({ name: 'address_line', nullable: true })
  addressLine?: string;

  @Column({ type: 'decimal', nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', nullable: true })
  longitude?: number;

  @Column({ type: 'decimal', nullable: true })
  price?: number;

  @Column({
    name: 'price_currency',
    type: 'enum',
    enum: Currency,
    default: Currency.EUR,
  })
  priceCurrency: Currency;

  @Column({
    name: 'price_period',
    type: 'enum',
    enum: HousingPricePeriod,
    nullable: true,
  })
  pricePeriod?: HousingPricePeriod;

  @Column({ name: 'available_rooms', default: 0 })
  availableRooms: number;

  @Column({ nullable: true })
  bedrooms?: number;

  @Column({ nullable: true })
  bathrooms?: number;

  @Column({ type: 'text', array: true, nullable: true })
  imageUrls?: string[];

  @OneToMany(() => HousingRoom, (room) => room.housingListing, {
    cascade: true,
  })
  rooms: HousingRoom[];

  @OneToMany(
    () => HousingBookingRequest,
    (bookingRequest) => bookingRequest.housingListing,
  )
  bookingRequests?: HousingBookingRequest[];

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
