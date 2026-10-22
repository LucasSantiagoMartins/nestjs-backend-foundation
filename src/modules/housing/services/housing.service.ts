import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { HousingListing } from '../entities/housing-listing.entity';
import { HousingRoom } from '../entities/housing-room.entity';
import { HousingBookingRequest } from '../entities/housing-booking-request.entity';
import { CreateHousingDto } from '../dtos/create-housing.dto';
import { UpdateHousingDto } from '../dtos/update-housing.dto';
import { HousingListingStatus } from '../enums/housing-listing-status.enum';
import { HousingBookingRequestStatus } from '../enums/housing-booking-request-status.enum';
import { UploadService } from '@modules/upload/services/upload.service';

const MAX_ROOM_IMAGES = 4;

@Injectable()
export class HousingService {
  constructor(
    @InjectRepository(HousingListing)
    private readonly housingRepo: Repository<HousingListing>,
    private readonly dataSource: DataSource,
    private readonly uploadService: UploadService,
  ) {}

  private validateHousingRoomInput(rooms: CreateHousingDto['rooms']) {
    if (!Array.isArray(rooms)) {
      throw new BadRequestException(
        'Os quartos do alojamento devem ser enviados em uma lista.',
      );
    }

    rooms.forEach((room, index) => {
      const imageUrls = room?.imageUrls;

      if (!Array.isArray(imageUrls)) {
        throw new BadRequestException(
          `O quarto ${index + 1} deve ter pelo menos uma imagem.`,
        );
      }

      const hasValidImage = imageUrls.some(
        (url) => typeof url === 'string' && url.trim().length > 0,
      );

      if (!hasValidImage) {
        throw new BadRequestException(
          `O quarto ${index + 1} deve ter pelo menos uma imagem.`,
        );
      }

      if (imageUrls.length > MAX_ROOM_IMAGES) {
        throw new BadRequestException(
          `O quarto ${index + 1} pode ter no máximo ${MAX_ROOM_IMAGES} imagens.`,
        );
      }
    });
  }

  async create(userId: number, dto: CreateHousingDto): Promise<HousingListing> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(HousingListing);
      const roomRepo = manager.getRepository(HousingRoom);

      this.validateHousingRoomInput(dto.rooms);

      const housing = repo.create({
        publisherId: userId,
        status: HousingListingStatus.PUBLISHED,
        publishedAt: new Date(),
        expiresAt: this.validateExpiration(dto.expiresAt),
        title: dto.title,
        description: dto.description,
        propertyType: dto.propertyType,
        accommodationType: dto.accommodationType,
        municipality: dto.municipality,
        addressLine: dto.addressLine,
        latitude: dto.latitude as any,
        longitude: dto.longitude as any,
        price: dto.price as any,
        priceCurrency: dto.priceCurrency,
        pricePeriod: dto.pricePeriod as any,
        availableRooms: dto.rooms.filter((room) => !(room.reserved ?? false))
          .length,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        imageUrls: dto.imageUrls,
      } as Partial<HousingListing>);

      const saved = await repo.save(housing);

      const rooms = dto.rooms.map((room, index) =>
        roomRepo.create({
          housingListingId: saved.id,
          roomNumber: index + 1,
          reserved: room.reserved ?? false,
          description: room.description,
          imageUrls: room.imageUrls,
        }),
      );

      const savedRooms = await roomRepo.save(rooms);
      saved.rooms = savedRooms;
      saved.availableRooms = savedRooms.filter((room) => !room.reserved).length;

      await this.uploadService.markAsUsed(
        [
          ...dto.imageUrls,
          ...dto.rooms.flatMap((room) => room.imageUrls ?? []),
        ],
        userId,
        manager,
      );

      return saved;
    });
  }

  markRoomAsReserved(housing: HousingListing, roomId: number): boolean {
    const room = housing.rooms?.find((item) => item.id === roomId);
    if (!room || room.reserved) {
      return false;
    }

    room.reserved = true;
    if (housing.availableRooms > 0) {
      housing.availableRooms -= 1;
    }

    return true;
  }

  releaseRoomReservation(housing: HousingListing, roomId: number): boolean {
    const room = housing.rooms?.find((item) => item.id === roomId);
    if (!room || !room.reserved) {
      return false;
    }

    room.reserved = false;
    housing.availableRooms += 1;
    return true;
  }

  private async findHousingOrFail(id: number, publisherId: number) {
    const housing = await this.housingRepo.findOne({
      where: { id, publisherId },
      relations: { rooms: true },
    });
    if (!housing) throw new NotFoundException('Alojamento não encontrado.');
    return housing;
  }

  private async reconcileRooms(
    manager: EntityManager,
    housing: HousingListing,
    roomsDto: CreateHousingDto['rooms'],
  ): Promise<HousingRoom[]> {
    const roomRepo = manager.getRepository(HousingRoom);
    const bookingRepo = manager.getRepository(HousingBookingRequest);

    const existing = [...(housing.rooms ?? [])].sort(
      (a, b) => a.roomNumber - b.roomNumber,
    );

    const removable = existing.slice(roomsDto.length);

    if (removable.length > 0) {
      const referencedByBooking = await bookingRepo.exists({
        where: { housingRoomId: In(removable.map((room) => room.id)) },
      });

      if (referencedByBooking || removable.some((room) => room.reserved)) {
        throw new BadRequestException(
          'Não é possível remover quartos reservados ou com pedidos de reserva.',
        );
      }

      await roomRepo.delete(removable.map((room) => room.id));
    }

    const rooms: HousingRoom[] = [];

    for (let index = 0; index < roomsDto.length; index += 1) {
      const input = roomsDto[index];
      const roomNumber = index + 1;
      const current = existing[index];

      if (!current) {
        const created = roomRepo.create({
          housingListingId: housing.id,
          roomNumber,
          reserved: input.reserved ?? false,
          description: input.description,
          imageUrls: input.imageUrls,
        });
        rooms.push(await roomRepo.save(created));
        continue;
      }

      current.roomNumber = roomNumber;
      if (input.description !== undefined) {
        current.description = input.description;
      }
      current.imageUrls = input.imageUrls;
      if (input.reserved !== undefined) {
        current.reserved = input.reserved;
      }

      rooms.push(await roomRepo.save(current));
    }

    return rooms;
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateHousingDto,
  ): Promise<HousingListing> {
    return this.dataSource.transaction(async (manager) => {
      const housingRepo = manager.getRepository(HousingListing);

      const housing = await housingRepo.findOne({
        where: { id, publisherId: userId },
        relations: { rooms: true },
      });

      if (!housing) {
        throw new NotFoundException('Alojamento não encontrado.');
      }

      const { rooms: roomsDto, expiresAt, ...fields } = dto;
      const parsedExpiration =
        expiresAt === undefined
          ? undefined
          : this.validateExpiration(expiresAt);
      const imageUrlsToMark = [
        ...(fields.imageUrls?.filter(
          (url) => !housing.imageUrls?.includes(url),
        ) ?? []),
        ...(roomsDto?.flatMap((room, index) => {
          const previousUrls = housing.rooms?.[index]?.imageUrls ?? [];
          return (room.imageUrls ?? []).filter(
            (url) => !previousUrls.includes(url),
          );
        }) ?? []),
      ];

      if (roomsDto) {
        this.validateHousingRoomInput(roomsDto);
      }

      Object.assign(housing, fields);
      if (parsedExpiration !== undefined) housing.expiresAt = parsedExpiration;

      if (roomsDto) {
        const rooms = await this.reconcileRooms(manager, housing, roomsDto);
        housing.rooms = rooms;
        housing.availableRooms = rooms.filter((room) => !room.reserved).length;
      }

      if (imageUrlsToMark.length) {
        await this.uploadService.markAsUsed(imageUrlsToMark, userId, manager);
      }

      const saved = await housingRepo.save(housing);

      return (await housingRepo.findOne({
        where: { id: saved.id },
        relations: { rooms: true },
      })) as HousingListing;
    });
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.findHousingOrFail(id, userId);
    await this.housingRepo.delete({ id });
  }

  async hasPendingBookingRequestsForUser(
    userId: number,
    manager?: EntityManager,
  ): Promise<boolean> {
    const bookingRepo = (manager ?? this.dataSource.manager).getRepository(
      HousingBookingRequest,
    );

    return bookingRepo.exists({
      where: [
        { userId, status: HousingBookingRequestStatus.PENDING },
        {
          housingListing: { publisherId: userId },
          status: HousingBookingRequestStatus.PENDING,
        },
      ],
    });
  }

  async removeUserData(userId: number, manager: EntityManager): Promise<void> {
    await manager.getRepository(HousingBookingRequest).delete({ userId });
    await manager.getRepository(HousingListing).delete({ publisherId: userId });
  }

  async changeStatus(
    userId: number,
    id: number,
    status: HousingListingStatus.PAUSED | HousingListingStatus.CLOSED,
  ): Promise<HousingListing> {
    const housing = await this.findHousingOrFail(id, userId);

    switch (status) {
      case HousingListingStatus.PAUSED:
        if (housing.status !== HousingListingStatus.PUBLISHED)
          throw new BadRequestException('O alojamento não está publicado.');
        break;
      case HousingListingStatus.CLOSED:
        if (housing.status === HousingListingStatus.CLOSED)
          throw new BadRequestException('O alojamento já está encerrado.');
        break;
      default:
        throw new BadRequestException(
          'A transição de estado solicitada não é permitida para este alojamento.',
        );
    }

    housing.status = status;
    const saved = await this.housingRepo.save(housing);
    return (await this.housingRepo.findOne({
      where: { id: saved.id },
    })) as HousingListing;
  }

  private validateExpiration(value: string): Date {
    const expiresAt = new Date(value);
    if (
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'A data de disponibilidade deve ser futura.',
      );
    }
    return expiresAt;
  }

  @Cron('0 */15 * * * *')
  async expireListings(): Promise<void> {
    await this.housingRepo.update(
      {
        status: In([
          HousingListingStatus.PUBLISHED,
          HousingListingStatus.PAUSED,
        ]),
        expiresAt: LessThanOrEqual(new Date()),
      },
      { status: HousingListingStatus.EXPIRED },
    );
  }
}
