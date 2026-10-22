import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HousingBookingRequestResponseDto } from '../dtos/housing-booking-request-response.dto';
import { HousingBookingRequest } from '../entities/housing-booking-request.entity';
import { HousingListing } from '../entities/housing-listing.entity';

@Injectable()
export class HousingBookingRequestQueryService {
  constructor(
    @InjectRepository(HousingBookingRequest)
    private readonly bookingRequestRepo: Repository<HousingBookingRequest>,
    @InjectRepository(HousingListing)
    private readonly housingRepo: Repository<HousingListing>,
  ) {}

  private async findBookingOrFail(id: number): Promise<HousingBookingRequest> {
    const booking = await this.bookingRequestRepo.findOne({
      where: { id },
      relations: { housingListing: true, housingRoom: true },
    });

    if (!booking) {
      throw new NotFoundException('Pedido de reserva não encontrado.');
    }

    return booking;
  }

  private async findHousingOrFail(id: number): Promise<HousingListing> {
    const housing = await this.housingRepo.findOne({
      where: { id },
      relations: { rooms: true },
    });

    if (!housing) {
      throw new NotFoundException('Alojamento não encontrado.');
    }

    return housing;
  }

  async listMine(userId: number): Promise<HousingBookingRequestResponseDto[]> {
    const bookings = await this.bookingRequestRepo.find({
      where: { userId },
      relations: { housingListing: true, housingRoom: true },
      order: { createdAt: 'DESC' },
    });

    return bookings.map((booking) =>
      HousingBookingRequestResponseDto.fromEntity(booking),
    );
  }

  async findMineById(
    userId: number,
    id: number,
  ): Promise<HousingBookingRequestResponseDto> {
    const booking = await this.bookingRequestRepo.findOne({
      where: { id, userId },
      relations: { housingListing: true, housingRoom: true },
    });

    if (!booking) {
      throw new NotFoundException(
        'Pedido de reserva não encontrado para este utilizador.',
      );
    }

    return HousingBookingRequestResponseDto.fromEntity(booking);
  }

  async listForPublisher(
    publisherId: number,
  ): Promise<HousingBookingRequestResponseDto[]> {
    const listings = await this.housingRepo.find({
      where: { publisherId },
      select: { id: true },
    });

    if (!listings.length) {
      return [];
    }

    const ids = listings.map((listing) => listing.id);
    const bookings = await this.bookingRequestRepo.find({
      where: ids.map((id) => ({ housingListingId: id })),
      relations: { housingListing: true, housingRoom: true },
      order: { createdAt: 'DESC' },
    });

    return bookings.map((booking) =>
      HousingBookingRequestResponseDto.fromEntity(booking),
    );
  }

  async findForPublisher(
    publisherId: number,
    id: number,
  ): Promise<HousingBookingRequestResponseDto> {
    const booking = await this.findBookingOrFail(id);
    const listing = await this.findHousingOrFail(booking.housingListingId);

    if (listing.publisherId !== publisherId) {
      throw new ForbiddenException(
        'Você não tem acesso a este pedido de reserva.',
      );
    }

    return HousingBookingRequestResponseDto.fromEntity(booking);
  }
}
