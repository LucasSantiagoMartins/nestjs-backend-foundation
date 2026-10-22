import { EmailTemplateType } from '@backend-foundation/common/enums/email-template-type.enum';
import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { QUEUES } from '@infra/queue/queue.constants';
import { NotificationService } from '@modules/notification/services/notification.service';
import { User } from '@modules/user/entities/user.entity';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource, Repository } from 'typeorm';
import { CreateHousingBookingRequestDto } from '../dtos/create-housing-booking-request.dto';
import { HousingBookingRequestResponseDto } from '../dtos/housing-booking-request-response.dto';
import { HousingBookingRequest } from '../entities/housing-booking-request.entity';
import { HousingListing } from '../entities/housing-listing.entity';
import { HousingRoom } from '../entities/housing-room.entity';
import { AccommodationType } from '../enums/accommodation-type.enum';
import { HousingBookingRequestStatus } from '../enums/housing-booking-request-status.enum';
import { HousingService } from './housing.service';

@Injectable()
export class HousingBookingRequestService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly housingService: HousingService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly notificationService: NotificationService,
    @InjectQueue(QUEUES.MAIL) private readonly mailQueue: Queue,
    private readonly logger: AppLogger,
  ) {}

  async create(
    userId: number,
    dto: CreateHousingBookingRequestDto,
  ): Promise<HousingBookingRequestResponseDto> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(HousingBookingRequest);
      const listingRepo = manager.getRepository(HousingListing);
      const roomRepo = manager.getRepository(HousingRoom);

      const listing = await listingRepo.findOne({
        where: { id: dto.housingListingId },
        relations: { rooms: true },
      });

      if (!listing) {
        throw new NotFoundException('Alojamento não encontrado.');
      }

      const room = await roomRepo.findOne({
        where: { id: dto.housingRoomId, housingListingId: listing.id },
      });

      if (!room) {
        throw new NotFoundException(
          'Quarto não encontrado para este alojamento.',
        );
      }

      if (room.reserved) {
        throw new BadRequestException('Este quarto já está reservado.');
      }

      if (!listing.price || listing.price <= 0) {
        throw new BadRequestException(
          'O alojamento não possui preço válido para calcular a reserva.',
        );
      }

      if (!listing.pricePeriod) {
        throw new BadRequestException(
          'O alojamento não possui um período de preço definido.',
        );
      }

      const totalPrice = Number((listing.price * dto.quantity).toFixed(2));

      const booking = bookingRepo.create({
        housingListingId: dto.housingListingId,
        userId,
        housingRoomId: dto.housingRoomId,
        quantity: dto.quantity,
        period: listing.pricePeriod,
        totalPrice,
        status: HousingBookingRequestStatus.PENDING,
      });

      const saved = await bookingRepo.save(booking);
      return {
        response: HousingBookingRequestResponseDto.fromEntity(saved),
        publisherId: listing.publisherId,
        housingTitle: listing.title,
      };
    });
    await this.notifyBookingParty(
      outcome.publisherId,
      outcome.response,
      'Novo pedido de reserva',
      `Recebeste um novo pedido de reserva para ${outcome.housingTitle}.`,
      outcome.housingTitle,
      'HOUSING_BOOKING_REQUEST_CREATED',
    );
    return outcome.response;
  }

  async transition(
    publisherId: number,
    id: number,
    action: HousingBookingRequestStatus,
  ): Promise<HousingBookingRequestResponseDto> {
    const isAccept = action === HousingBookingRequestStatus.ACCEPTED;
    const isReject = action === HousingBookingRequestStatus.REJECTED;
    const isRelease = action === HousingBookingRequestStatus.RELEASED;

    if (!isAccept && !isReject && !isRelease) {
      throw new BadRequestException(
        'A transição de estado solicitada não é permitida para este pedido de reserva.',
      );
    }

    const outcome = await this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(HousingBookingRequest);
      const listingRepo = manager.getRepository(HousingListing);
      const roomRepo = manager.getRepository(HousingRoom);

      const booking = await bookingRepo.findOne({
        where: { id },
        relations: { housingListing: true, housingRoom: true },
      });

      if (!booking) {
        throw new NotFoundException('Pedido de reserva não encontrado.');
      }

      const listing = await listingRepo.findOne({
        where: { id: booking.housingListingId },
        relations: { rooms: true },
      });

      if (!listing) {
        throw new NotFoundException('Alojamento não encontrado.');
      }

      if (listing.publisherId !== publisherId) {
        throw new ForbiddenException(
          isAccept
            ? 'Você não pode aceitar pedidos de outro publisher.'
            : isReject
              ? 'Você não pode rejeitar pedidos de outro publisher.'
              : 'Você não pode liberar pedidos de outro publisher.',
        );
      }

      const requiredStatus = isRelease
        ? HousingBookingRequestStatus.ACCEPTED
        : HousingBookingRequestStatus.PENDING;

      if (booking.status !== requiredStatus) {
        throw new BadRequestException(
          isAccept
            ? 'Este pedido já foi processado.'
            : isReject
              ? 'Somente pedidos pendentes podem ser rejeitados.'
              : 'Somente reservas aceites podem ser liberadas.',
        );
      }

      if (isAccept) {
        if (!booking.housingRoomId) {
          throw new BadRequestException(
            'É obrigatório informar o quarto da reserva.',
          );
        }

        const room = await roomRepo.findOne({
          where: { id: booking.housingRoomId, housingListingId: listing.id },
        });

        if (!room) {
          throw new NotFoundException('Quarto não encontrado para a reserva.');
        }

        if (room.reserved) {
          throw new BadRequestException(
            'O quarto solicitado já está reservado.',
          );
        }

        if (listing.availableRooms <= 0) {
          throw new BadRequestException(
            'Não há quartos disponíveis para este alojamento.',
          );
        }

        const roomReserved = room.markAsReserved();
        if (!roomReserved) {
          throw new BadRequestException(
            'Não foi possível reservar o quarto solicitado.',
          );
        }

        const listingUpdated = this.housingService.markRoomAsReserved(
          listing,
          room.id,
        );
        if (!listingUpdated) {
          throw new BadRequestException(
            'Não foi possível atualizar a disponibilidade do alojamento.',
          );
        }

        await roomRepo.save(room);
        await listingRepo.save(listing);
      }

      if (
        isRelease &&
        listing.accommodationType === AccommodationType.SHARED_ROOM &&
        booking.housingRoomId
      ) {
        const room = await roomRepo.findOne({
          where: { id: booking.housingRoomId, housingListingId: listing.id },
        });

        if (room && room.reserved) {
          room.releaseReservation();
          listing.availableRooms += 1;
          await roomRepo.save(room);
          await listingRepo.save(listing);
        }
      }

      booking.status = action;

      if (isAccept) {
        booking.acceptedAt = new Date();
      } else if (isReject) {
        booking.rejectedAt = new Date();
      } else {
        booking.releasedAt = new Date();
      }

      const saved = await bookingRepo.save(booking);

      return {
        response: HousingBookingRequestResponseDto.fromEntity(saved),
        userId: booking.userId,
        housingTitle: listing.title,
      };
    });
    const updates: Record<
      HousingBookingRequestStatus,
      { title: string; message: string }
    > = {
      [HousingBookingRequestStatus.PENDING]: { title: '', message: '' },
      [HousingBookingRequestStatus.ACCEPTED]: {
        title: 'Pedido de reserva aceite',
        message: 'O teu pedido de reserva foi aceite.',
      },
      [HousingBookingRequestStatus.REJECTED]: {
        title: 'Pedido de reserva rejeitado',
        message: 'O teu pedido de reserva foi rejeitado.',
      },
      [HousingBookingRequestStatus.CANCELLED]: { title: '', message: '' },
      [HousingBookingRequestStatus.RELEASED]: {
        title: 'Reserva liberada',
        message: 'A tua reserva foi liberada pelo publisher.',
      },
    };
    await this.notifyBookingParty(
      outcome.userId,
      outcome.response,
      updates[action].title,
      updates[action].message,
      outcome.housingTitle,
      action,
    );
    return outcome.response;
  }

  async cancel(
    userId: number,
    id: number,
  ): Promise<HousingBookingRequestResponseDto> {
    const outcome = await this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(HousingBookingRequest);
      const listingRepo = manager.getRepository(HousingListing);
      const roomRepo = manager.getRepository(HousingRoom);

      const booking = await bookingRepo.findOne({
        where: { id, userId },
        relations: { housingListing: true, housingRoom: true },
      });

      if (!booking) {
        throw new NotFoundException(
          'Pedido de reserva não encontrado para este utilizador.',
        );
      }

      if (
        ![
          HousingBookingRequestStatus.PENDING,
          HousingBookingRequestStatus.ACCEPTED,
        ].includes(booking.status)
      ) {
        throw new BadRequestException(
          'Este pedido não pode ser cancelado no estado atual.',
        );
      }

      const listing = await listingRepo.findOne({
        where: { id: booking.housingListingId },
        relations: { rooms: true },
      });

      if (
        listing?.accommodationType === AccommodationType.SHARED_ROOM &&
        booking.housingRoomId
      ) {
        const room = await roomRepo.findOne({
          where: { id: booking.housingRoomId, housingListingId: listing.id },
        });

        if (
          room &&
          room.reserved &&
          booking.status === HousingBookingRequestStatus.ACCEPTED
        ) {
          room.releaseReservation();
          listing.availableRooms += 1;
          await roomRepo.save(room);
          await listingRepo.save(listing);
        }
      }

      booking.status = HousingBookingRequestStatus.CANCELLED;
      booking.cancelledAt = new Date();
      const saved = await bookingRepo.save(booking);

      return {
        response: HousingBookingRequestResponseDto.fromEntity(saved),
        publisherId: listing?.publisherId,
        housingTitle: listing?.title ?? 'o alojamento',
      };
    });
    if (outcome.publisherId) {
      await this.notifyBookingParty(
        outcome.publisherId,
        outcome.response,
        'Pedido de reserva cancelado',
        `O utilizador cancelou o pedido de reserva #${id} para ${outcome.housingTitle}.`,
        outcome.housingTitle,
        HousingBookingRequestStatus.CANCELLED,
      );
    }
    return outcome.response;
  }

  private async notifyBookingParty(
    userId: number,
    booking: HousingBookingRequestResponseDto,
    title: string,
    message: string,
    housingTitle: string,
    event: string,
  ): Promise<void> {
    try {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: { profile: true },
      });
      const tasks: Promise<unknown>[] = [
        this.notificationService.notify({ userId, title, message }),
      ];
      if (user?.email) {
        tasks.push(
          this.mailQueue.add(
            'send_email',
            {
              to: user.email,
              template: EmailTemplateType.HOUSING_BOOKING_REQUEST_UPDATE,
              context: {
                userName: user.profile?.fullName ?? 'Utilizador',
                message,
                housingTitle,
                bookingId: booking.id,
              },
            },
            {
              jobId: `housing-booking-${booking.id}-${event}-${userId}`,
              attempts: 3,
              backoff: { type: 'exponential', delay: 5000 },
              removeOnComplete: true,
              removeOnFail: false,
            },
          ),
        );
      }
      const results = await Promise.allSettled(tasks);
      const failures = results.filter((result) => result.status === 'rejected');
      if (failures.length) {
        this.logger.warn({
          msg: `${failures.length} avisos falharam para o pedido de reserva ${booking.id}.`,
          action: 'HOUSING_BOOKING_NOTIFICATION_FAILED',
          service: 'HousingBookingRequest',
          data: { bookingId: booking.id, failures: failures.length },
        });
      }
    } catch (error) {
      this.logger.error({
        msg: `Não foi possível enviar avisos para o pedido de reserva ${booking.id}.`,
        action: 'HOUSING_BOOKING_NOTIFICATION_ERROR',
        service: 'HousingBookingRequest',
        data: { bookingId: booking.id },
        error,
      });
    }
  }
}
