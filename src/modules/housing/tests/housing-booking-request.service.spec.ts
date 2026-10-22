import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { QUEUES } from '@infra/queue/queue.constants';
import { NotificationService } from '@modules/notification/services/notification.service';
import { User } from '@modules/user/entities/user.entity';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HousingBookingRequest } from '../entities/housing-booking-request.entity';
import { HousingListing } from '../entities/housing-listing.entity';
import { HousingRoom } from '../entities/housing-room.entity';
import { AccommodationType } from '../enums/accommodation-type.enum';
import { HousingBookingRequestStatus } from '../enums/housing-booking-request-status.enum';
import { HousingPricePeriod } from '../enums/housing-price-period.enum';
import { HousingBookingRequestService } from '../services/housing-booking-request.service';
import { HousingService } from '../services/housing.service';

describe('HousingBookingRequestService', () => {
  let service: HousingBookingRequestService;

  const bookingRequestRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const housingRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const roomRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const userRepo = { findOne: jest.fn().mockResolvedValue(null) };

  const getRepository = jest.fn((entity) => {
    if (entity === HousingBookingRequest) return bookingRequestRepo;
    if (entity === HousingListing) return housingRepo;
    if (entity === HousingRoom) return roomRepo;
  });

  const mockDataSource = {
    getRepository,
    transaction: jest.fn((cb) =>
      cb({
        getRepository,
      }),
    ),
  };

  const housingService = {
    markRoomAsReserved: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HousingBookingRequestService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: HousingService, useValue: housingService },
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: NotificationService,
          useValue: { notify: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: getQueueToken(QUEUES.MAIL),
          useValue: { add: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: AppLogger,
          useValue: { warn: jest.fn(), error: jest.fn(), log: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<HousingBookingRequestService>(
      HousingBookingRequestService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should create a pending booking request and calculate total price', async () => {
    const listing = {
      id: 7,
      publisherId: 99,
      title: 'Room in Lisbon',
      price: 50,
      pricePeriod: HousingPricePeriod.WEEK,
      accommodationType: AccommodationType.PRIVATE_ROOM,
      status: 'PUBLISHED',
    } as any;

    const room = {
      id: 1,
      housingListingId: 7,
      reserved: false,
    } as any;

    housingRepo.findOne.mockResolvedValue(listing);
    roomRepo.findOne.mockResolvedValue(room);
    bookingRequestRepo.create.mockImplementation((data) => ({ ...data }));
    bookingRequestRepo.save.mockImplementation(async (data) => ({
      id: 1,
      ...data,
    }));

    const result = await service.create(10, {
      housingListingId: 7,
      housingRoomId: 1,
      quantity: 3,
    });

    expect(result).toBeDefined();
    expect(result.totalPrice).toBe(150);
    expect(result.status).toBe(HousingBookingRequestStatus.PENDING);
    expect(result.userId).toBe(10);
    expect(bookingRequestRepo.save).toHaveBeenCalled();
  });

  it('should throw NotFoundException if room is not found during create', async () => {
    const listing = {
      id: 9,
      publisherId: 99,
      price: 40,
      pricePeriod: HousingPricePeriod.NIGHT,
      accommodationType: AccommodationType.SHARED_ROOM,
      status: 'PUBLISHED',
    } as any;

    housingRepo.findOne.mockResolvedValue(listing);
    roomRepo.findOne.mockResolvedValue(null);

    await expect(
      service.create(10, {
        housingListingId: 9,
        housingRoomId: 999,
        quantity: 2,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  describe('transition', () => {
    it('should accept a pending booking request successfully', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        housingRoomId: 1,
        status: HousingBookingRequestStatus.PENDING,
      } as any;

      const listing = {
        id: 7,
        publisherId: 99,
        availableRooms: 2,
      } as any;

      const room = {
        id: 1,
        housingListingId: 7,
        reserved: false,
        markAsReserved: jest.fn().mockReturnValue(true),
      } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);
      housingRepo.findOne.mockResolvedValue(listing);
      roomRepo.findOne.mockResolvedValue(room);
      bookingRequestRepo.save.mockImplementation(async (b) => b);

      const result = await service.transition(
        99,
        1,
        HousingBookingRequestStatus.ACCEPTED,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(HousingBookingRequestStatus.ACCEPTED);
      expect(room.markAsReserved).toHaveBeenCalled();
      expect(housingService.markRoomAsReserved).toHaveBeenCalledWith(
        listing,
        room.id,
      );
      expect(booking.acceptedAt).toBeInstanceOf(Date);
    });

    it('should reject accepting an already processed booking request', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        status: HousingBookingRequestStatus.ACCEPTED,
      } as any;
      const listing = { id: 7, publisherId: 99 } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);
      housingRepo.findOne.mockResolvedValue(listing);

      await expect(
        service.transition(99, 1, HousingBookingRequestStatus.ACCEPTED),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not allow accepting bookings of another publisher', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        status: HousingBookingRequestStatus.PENDING,
      } as any;
      const listing = { id: 7, publisherId: 100 } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);
      housingRepo.findOne.mockResolvedValue(listing);

      await expect(
        service.transition(99, 1, HousingBookingRequestStatus.ACCEPTED),
      ).rejects.toThrow('Você não pode aceitar pedidos de outro publisher.');
    });

    it('should reject a pending booking request successfully', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        status: HousingBookingRequestStatus.PENDING,
      } as any;
      const listing = { id: 7, publisherId: 99 } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);
      housingRepo.findOne.mockResolvedValue(listing);
      bookingRequestRepo.save.mockImplementation(async (b) => b);

      const result = await service.transition(
        99,
        1,
        HousingBookingRequestStatus.REJECTED,
      );

      expect(result.status).toBe(HousingBookingRequestStatus.REJECTED);
      expect(booking.rejectedAt).toBeInstanceOf(Date);
    });

    it('should not reject a booking request that is not pending', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        status: HousingBookingRequestStatus.CANCELLED,
      } as any;
      const listing = { id: 7, publisherId: 99 } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);
      housingRepo.findOne.mockResolvedValue(listing);

      await expect(
        service.transition(99, 1, HousingBookingRequestStatus.REJECTED),
      ).rejects.toThrow('Somente pedidos pendentes podem ser rejeitados.');
    });

    it('should keep the rejection authorization message', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        status: HousingBookingRequestStatus.PENDING,
      } as any;
      const listing = { id: 7, publisherId: 100 } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);
      housingRepo.findOne.mockResolvedValue(listing);

      await expect(
        service.transition(99, 1, HousingBookingRequestStatus.REJECTED),
      ).rejects.toThrow('Você não pode rejeitar pedidos de outro publisher.');
    });

    it('should release an accepted booking request successfully', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        housingRoomId: 1,
        status: HousingBookingRequestStatus.ACCEPTED,
      } as any;
      const listing = {
        id: 7,
        publisherId: 99,
        availableRooms: 0,
        accommodationType: AccommodationType.SHARED_ROOM,
      } as any;
      const room = {
        id: 1,
        housingListingId: 7,
        reserved: true,
        releaseReservation: jest.fn(),
      } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);
      housingRepo.findOne.mockResolvedValue(listing);
      roomRepo.findOne.mockResolvedValue(room);
      bookingRequestRepo.save.mockImplementation(async (b) => b);

      const result = await service.transition(
        99,
        1,
        HousingBookingRequestStatus.RELEASED,
      );

      expect(result.status).toBe(HousingBookingRequestStatus.RELEASED);
      expect(room.releaseReservation).toHaveBeenCalled();
      expect(listing.availableRooms).toBe(1);
      expect(booking.releasedAt).toBeInstanceOf(Date);
    });

    it('should not release a booking request that was not accepted', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        status: HousingBookingRequestStatus.PENDING,
      } as any;
      const listing = { id: 7, publisherId: 99 } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);
      housingRepo.findOne.mockResolvedValue(listing);

      await expect(
        service.transition(99, 1, HousingBookingRequestStatus.RELEASED),
      ).rejects.toThrow('Somente reservas aceites podem ser liberadas.');
    });

    it('should keep the release authorization message', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        status: HousingBookingRequestStatus.ACCEPTED,
      } as any;
      const listing = { id: 7, publisherId: 100 } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);
      housingRepo.findOne.mockResolvedValue(listing);

      await expect(
        service.transition(99, 1, HousingBookingRequestStatus.RELEASED),
      ).rejects.toThrow('Você não pode liberar pedidos de outro publisher.');
    });

    it('should reject a target status outside the allowed actions with 400', async () => {
      await expect(
        service.transition(99, 1, HousingBookingRequestStatus.PENDING),
      ).rejects.toThrow(BadRequestException);
      expect(bookingRequestRepo.findOne).not.toHaveBeenCalled();

      await expect(
        service.transition(99, 1, HousingBookingRequestStatus.CANCELLED),
      ).rejects.toThrow(BadRequestException);
      expect(bookingRequestRepo.findOne).not.toHaveBeenCalled();
    });

    it('should propagate not found bookings', async () => {
      bookingRequestRepo.findOne.mockResolvedValue(null);

      await expect(
        service.transition(99, 999, HousingBookingRequestStatus.ACCEPTED),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the listing is missing', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        status: HousingBookingRequestStatus.PENDING,
      } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);
      housingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.transition(99, 1, HousingBookingRequestStatus.REJECTED),
      ).rejects.toThrow('Alojamento não encontrado.');
    });
  });

  describe('cancel', () => {
    it('should cancel a pending booking request as its owner', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        userId: 10,
        status: HousingBookingRequestStatus.PENDING,
      } as any;
      const listing = { id: 7 } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);
      housingRepo.findOne.mockResolvedValue(listing);
      bookingRequestRepo.save.mockImplementation(async (b) => b);

      const result = await service.cancel(10, 1);

      expect(result.status).toBe(HousingBookingRequestStatus.CANCELLED);
      expect(bookingRequestRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, userId: 10 } }),
      );
      expect(booking.cancelledAt).toBeInstanceOf(Date);
    });

    it('should release the room when an accepted booking is cancelled', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        housingRoomId: 1,
        userId: 10,
        status: HousingBookingRequestStatus.ACCEPTED,
      } as any;
      const listing = {
        id: 7,
        availableRooms: 0,
        accommodationType: AccommodationType.SHARED_ROOM,
      } as any;
      const room = {
        id: 1,
        housingListingId: 7,
        reserved: true,
        releaseReservation: jest.fn(),
      } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);
      housingRepo.findOne.mockResolvedValue(listing);
      roomRepo.findOne.mockResolvedValue(room);
      bookingRequestRepo.save.mockImplementation(async (b) => b);

      const result = await service.cancel(10, 1);

      expect(result.status).toBe(HousingBookingRequestStatus.CANCELLED);
      expect(room.releaseReservation).toHaveBeenCalled();
      expect(listing.availableRooms).toBe(1);
    });

    it('should not cancel a booking request of another user', async () => {
      bookingRequestRepo.findOne.mockResolvedValue(null);

      await expect(service.cancel(99, 1)).rejects.toThrow(NotFoundException);
      expect(bookingRequestRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, userId: 99 } }),
      );
    });

    it('should not cancel a booking request that was already processed', async () => {
      const booking = {
        id: 1,
        housingListingId: 7,
        userId: 10,
        status: HousingBookingRequestStatus.REJECTED,
      } as any;

      bookingRequestRepo.findOne.mockResolvedValue(booking);

      await expect(service.cancel(10, 1)).rejects.toThrow(
        'Este pedido não pode ser cancelado no estado atual.',
      );
    });
  });
});
