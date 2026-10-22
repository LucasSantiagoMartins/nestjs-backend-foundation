import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { HousingService } from '../services/housing.service';
import { HousingListing } from '../entities/housing-listing.entity';
import { HousingRoom } from '../entities/housing-room.entity';
import { HousingBookingRequest } from '../entities/housing-booking-request.entity';
import { HousingListingStatus } from '../enums/housing-listing-status.enum';
import { AccommodationType } from '../enums/accommodation-type.enum';
import { UploadService } from '@modules/upload/services/upload.service';

describe('HousingService', () => {
  let service: HousingService;

  let roomSequence = 100;

  const saveRooms = async (rooms: any) => {
    if (Array.isArray(rooms)) {
      return rooms.map((room) => ({ id: room.id ?? ++roomSequence, ...room }));
    }

    return { id: rooms.id ?? ++roomSequence, ...rooms };
  };

  const housingRepo = {
    create: jest.fn((dto) => dto),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const roomRepo = {
    create: jest.fn((dto) => dto),
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const bookingRequestRepo = {
    exists: jest.fn(),
  };

  const mockEntityManager = {
    getRepository: jest.fn((entity) => {
      if (entity === HousingListing) return housingRepo;
      if (entity === HousingRoom) return roomRepo;
      if (entity === HousingBookingRequest) return bookingRequestRepo;
      return undefined;
    }),
  };

  const mockDataSource = {
    transaction: jest.fn((cb) => cb(mockEntityManager)),
  };

  const resetMocks = () => {
    housingRepo.create.mockReset();
    housingRepo.create.mockImplementation((dto) => dto);
    housingRepo.findOne.mockReset();
    housingRepo.findOne.mockResolvedValue(null);
    housingRepo.findAndCount.mockReset();
    housingRepo.save.mockReset();
    housingRepo.save.mockImplementation(async (dto) => dto);
    housingRepo.delete.mockReset();
    roomRepo.create.mockReset();
    roomRepo.create.mockImplementation((dto) => dto);
    roomRepo.findOne.mockReset();
    roomRepo.save.mockReset();
    roomRepo.save.mockImplementation(saveRooms);
    roomRepo.delete.mockReset();
    bookingRequestRepo.exists.mockReset();
    bookingRequestRepo.exists.mockResolvedValue(false);
    mockEntityManager.getRepository.mockClear();
    mockDataSource.transaction.mockClear();
  };

  const roomInput = (overrides: Record<string, unknown> = {}) => ({
    description: 'Quarto',
    imageUrls: ['https://example.com/quarto.jpg'],
    ...overrides,
  });

  beforeEach(async () => {
    resetMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HousingService,
        { provide: getRepositoryToken(HousingListing), useValue: housingRepo },
        { provide: getRepositoryToken(HousingRoom), useValue: roomRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: UploadService, useValue: { markAsUsed: jest.fn() } },
      ],
    }).compile();

    service = module.get<HousingService>(HousingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a housing listing using the user id as publisherId', async () => {
      const created = { id: 1, rooms: [] } as any;
      housingRepo.create.mockReturnValue(created);

      const dto = {
        title: 'House',
        description: 'Nice',
        expiresAt: '2099-01-01T00:00:00.000Z',
        propertyType: 'APARTMENT',
        accommodationType: 'ENTIRE_PLACE',
        municipality: 'Lisboa',
        addressLine: 'Rua das Flores, 10',
        latitude: 38.7223,
        longitude: -9.1393,
        price: 100,
        pricePeriod: 'MONTH',
        bedrooms: 1,
        bathrooms: 1,
        imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
        rooms: [roomInput()],
      } as any;

      const result = await service.create(10, dto);

      expect(result).toBeDefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(result).toEqual(created);
      expect(housingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          publisherId: 10,
          status: HousingListingStatus.PUBLISHED,
          publishedAt: expect.any(Date),
          expiresAt: expect.any(Date),
        }),
      );
    });

    it('leaves country and currency defaults to persistence', async () => {
      housingRepo.create.mockImplementation((value) => ({ ...value }));
      housingRepo.save.mockImplementation(async (value) => ({
        id: 1,
        ...value,
      }));

      await service.create(10, {
        title: 'House',
        description: 'Nice',
        expiresAt: '2099-01-01T00:00:00.000Z',
        imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
        rooms: [roomInput()],
      } as any);

      expect(housingRepo.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ country: expect.anything() }),
      );
      expect(housingRepo.create.mock.calls[0][0]).toHaveProperty(
        'priceCurrency',
        undefined,
      );
    });

    it('should store municipality and addressLine', async () => {
      housingRepo.create.mockImplementation((value) => ({ ...value }));
      housingRepo.save.mockImplementation(async (value) => ({
        id: 1,
        ...value,
      }));

      await service.create(10, {
        title: 'House',
        description: 'Nice',
        expiresAt: '2099-01-01T00:00:00.000Z',
        municipality: 'Porto',
        addressLine: 'Rua do Almada, 5, 2.º andar',
        imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
        rooms: [roomInput()],
      } as any);

      expect(housingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          municipality: 'Porto',
          addressLine: 'Rua do Almada, 5, 2.º andar',
        }),
      );
    });

    it('should number rooms sequentially starting at 1 based on array position', async () => {
      housingRepo.create.mockImplementation((value) => ({ ...value }));
      housingRepo.save.mockImplementation(async (value) => ({
        id: 1,
        ...value,
      }));

      await service.create(10, {
        title: 'House',
        description: 'Nice',
        expiresAt: '2099-01-01T00:00:00.000Z',
        imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
        rooms: [
          roomInput({ description: 'Quarto principal' }),
          roomInput({ description: 'Segundo quarto' }),
          roomInput({ description: 'Terceiro quarto' }),
        ],
      } as any);

      expect(roomRepo.create).toHaveBeenCalledTimes(3);
      expect(roomRepo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ roomNumber: 1 }),
      );
      expect(roomRepo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ roomNumber: 2 }),
      );
      expect(roomRepo.create).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ roomNumber: 3 }),
      );
    });

    it('should set availableRooms to the number of non reserved rooms', async () => {
      housingRepo.create.mockImplementation((value) => ({ ...value }));
      housingRepo.save.mockImplementation(async (value) => ({
        id: 1,
        ...value,
      }));

      const result = await service.create(10, {
        title: 'Shared room listing',
        description: 'Room list',
        expiresAt: '2099-01-01T00:00:00.000Z',
        accommodationType: AccommodationType.SHARED_ROOM,
        imageUrls: ['cover.jpg', 'cover2.jpg', 'cover3.jpg'],
        rooms: [
          roomInput({ description: 'Double bed' }),
          roomInput({ description: 'Single bed', reserved: true }),
        ],
      } as any);

      expect(result.availableRooms).toBe(1);
      expect(result.rooms).toHaveLength(2);
    });

    it('should persist without coordinates when they are not provided', async () => {
      housingRepo.create.mockImplementation((value) => ({ ...value }));
      housingRepo.save.mockImplementation(async (value) => ({
        id: 1,
        ...value,
      }));

      await service.create(10, {
        title: 'House',
        description: 'Nice',
        expiresAt: '2099-01-01T00:00:00.000Z',
        imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
        rooms: [roomInput()],
      } as any);

      expect(housingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: undefined, longitude: undefined }),
      );
    });

    it('should accept coordinates provided together', async () => {
      housingRepo.create.mockImplementation((value) => ({ ...value }));
      housingRepo.save.mockImplementation(async (value) => ({
        id: 1,
        ...value,
      }));

      await service.create(10, {
        title: 'House',
        description: 'Nice',
        expiresAt: '2099-01-01T00:00:00.000Z',
        latitude: -90,
        longitude: 180,
        imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
        rooms: [roomInput()],
      } as any);

      expect(housingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -90, longitude: 180 }),
      );
    });

    it('should accept explicit null coordinates', async () => {
      housingRepo.create.mockImplementation((value) => ({ ...value }));
      housingRepo.save.mockImplementation(async (value) => ({
        id: 1,
        ...value,
      }));

      await service.create(10, {
        title: 'House',
        description: 'Nice',
        expiresAt: '2099-01-01T00:00:00.000Z',
        latitude: null,
        longitude: null,
        imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
        rooms: [roomInput()],
      } as any);

      expect(housingRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: null, longitude: null }),
      );
    });

    it('should reject a room without images', async () => {
      await expect(
        service.create(10, {
          title: 'House',
          description: 'Nice',
          expiresAt: '2099-01-01T00:00:00.000Z',
          imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
          rooms: [{ description: 'Quarto sem imagens' }],
        } as any),
      ).rejects.toThrow('O quarto 1 deve ter pelo menos uma imagem.');
    });

    it('should reject rooms with an empty image list', async () => {
      await expect(
        service.create(10, {
          title: 'House',
          description: 'Nice',
          expiresAt: '2099-01-01T00:00:00.000Z',
          imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
          rooms: [{ description: 'Quarto', imageUrls: [] }],
        } as any),
      ).rejects.toThrow('O quarto 1 deve ter pelo menos uma imagem.');
    });

    it('should reject a room whose images are only invalid values', async () => {
      await expect(
        service.create(10, {
          title: 'House',
          description: 'Nice',
          expiresAt: '2099-01-01T00:00:00.000Z',
          imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
          rooms: [{ description: 'Quarto', imageUrls: ['   '] }],
        } as any),
      ).rejects.toThrow('O quarto 1 deve ter pelo menos uma imagem.');
    });

    it('should reject a room with more than 4 images', async () => {
      await expect(
        service.create(10, {
          title: 'House',
          description: 'Nice',
          expiresAt: '2099-01-01T00:00:00.000Z',
          imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
          rooms: [
            {
              description: 'Quarto',
              imageUrls: [
                'https://example.com/1.jpg',
                'https://example.com/2.jpg',
                'https://example.com/3.jpg',
                'https://example.com/4.jpg',
                'https://example.com/5.jpg',
              ],
            },
          ],
        } as any),
      ).rejects.toThrow('O quarto 1 pode ter no máximo 4 imagens.');
    });

    it('should accept a room with 1 and a room with 4 images', async () => {
      housingRepo.create.mockImplementation((value) => ({ ...value }));
      housingRepo.save.mockImplementation(async (value) => ({
        id: 1,
        ...value,
      }));

      const result = await service.create(10, {
        title: 'House',
        description: 'Nice',
        expiresAt: '2099-01-01T00:00:00.000Z',
        imageUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
        rooms: [
          roomInput({ imageUrls: ['https://example.com/1.jpg'] }),
          roomInput({
            imageUrls: [
              'https://example.com/1.jpg',
              'https://example.com/2.jpg',
              'https://example.com/3.jpg',
              'https://example.com/4.jpg',
            ],
          }),
        ],
      } as any);

      expect(result.rooms).toHaveLength(2);
      expect((result.rooms as any)[1].imageUrls).toHaveLength(4);
    });

    it('should throw BadRequestException if housing is created without rooms', async () => {
      const dto = {
        title: 'Shared room listing',
        description: 'Room list',
        expiresAt: '2099-01-01T00:00:00.000Z',
        accommodationType: AccommodationType.SHARED_ROOM,
        imageUrls: ['cover.jpg', 'cover2.jpg', 'cover3.jpg'],
        rooms: undefined,
      } as any;

      await expect(service.create(10, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('room availability via markRoomAsReserved', () => {
    it('should decrement availableRooms and mark room as reserved when valid', () => {
      const listing = new HousingListing();
      listing.availableRooms = 2;
      listing.rooms = [
        { id: 1, reserved: false } as any,
        { id: 2, reserved: false } as any,
      ];

      const success = service.markRoomAsReserved(listing, 2);

      expect(success).toBe(true);
      expect(listing.availableRooms).toBe(1);
      expect(listing.rooms[1].reserved).toBe(true);
    });

    it('should return false if room does not exist or is already reserved', () => {
      const listing = new HousingListing();
      listing.availableRooms = 1;
      listing.rooms = [{ id: 1, reserved: true } as any];

      const success = service.markRoomAsReserved(listing, 1);

      expect(success).toBe(false);
      expect(listing.availableRooms).toBe(1);
    });
  });

  describe('releaseRoomReservation', () => {
    it('should increment availableRooms and release the room', () => {
      const listing = new HousingListing();
      listing.availableRooms = 0;
      listing.rooms = [{ id: 1, reserved: true } as any];

      const success = service.releaseRoomReservation(listing, 1);

      expect(success).toBe(true);
      expect(listing.availableRooms).toBe(1);
      expect(listing.rooms[0].reserved).toBe(false);
    });

    it('should return false when the room is not reserved', () => {
      const listing = new HousingListing();
      listing.availableRooms = 1;
      listing.rooms = [{ id: 1, reserved: false } as any];

      expect(service.releaseRoomReservation(listing, 1)).toBe(false);
      expect(listing.availableRooms).toBe(1);
    });
  });

  describe('update & remove ownership', () => {
    it('should throw NotFoundException when updating housing not owned', async () => {
      housingRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(10, 1, { title: 'x' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete when owner', async () => {
      housingRepo.findOne.mockResolvedValue({ id: 1, publisherId: 10 } as any);
      housingRepo.delete.mockResolvedValue({});
      await expect(service.remove(10, 1)).resolves.toBeUndefined();
      expect(housingRepo.delete).toHaveBeenCalledWith({ id: 1 });
    });
  });

  describe('update', () => {
    const ownedHousing = (overrides: Record<string, unknown> = {}) =>
      ({
        id: 1,
        publisherId: 10,
        title: 'T',
        description: 'D',
        municipality: 'Lisboa',
        addressLine: 'Rua A, 1',
        latitude: 38.7,
        longitude: -9.1,
        price: 50,
        rooms: [],
        availableRooms: 0,
        ...overrides,
      }) as any;

    it('should not overwrite omitted fields', async () => {
      const housing = ownedHousing();
      housingRepo.findOne.mockResolvedValue(housing);

      await service.update(10, 1, { title: 'Novo título' } as any);

      expect(housingRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Novo título',
          municipality: 'Lisboa',
          addressLine: 'Rua A, 1',
          latitude: 38.7,
          longitude: -9.1,
          price: 50,
        }),
      );
    });

    it('should keep existing coordinates when they are omitted', async () => {
      const housing = ownedHousing();
      housingRepo.findOne.mockResolvedValue(housing);

      await service.update(10, 1, { title: 'Novo' } as any);

      expect(housing.latitude).toBe(38.7);
      expect(housing.longitude).toBe(-9.1);
    });

    it('should clear coordinates when both are explicitly null', async () => {
      const housing = ownedHousing();
      housingRepo.findOne.mockResolvedValue(housing);

      await service.update(10, 1, { latitude: null, longitude: null } as any);

      expect(housing.latitude).toBeNull();
      expect(housing.longitude).toBeNull();
    });

    it('should renumber rooms by array position preserving room ids', async () => {
      const existingRooms = [
        {
          id: 11,
          housingListingId: 1,
          roomNumber: 1,
          reserved: false,
          description: 'A',
          imageUrls: ['a.jpg'],
        },
        {
          id: 12,
          housingListingId: 1,
          roomNumber: 2,
          reserved: false,
          description: 'B',
          imageUrls: ['b.jpg'],
        },
      ];
      const housing = ownedHousing({ rooms: existingRooms, availableRooms: 2 });
      housingRepo.findOne.mockResolvedValue(housing);

      const result = await service.update(10, 1, {
        rooms: [
          {
            description: 'Novo primeiro',
            imageUrls: ['https://example.com/1.jpg'],
          },
          {
            description: 'Novo segundo',
            imageUrls: ['https://example.com/2.jpg'],
          },
        ],
      } as any);

      expect(roomRepo.create).not.toHaveBeenCalled();
      expect(roomRepo.save).toHaveBeenCalledTimes(2);
      expect(roomRepo.delete).not.toHaveBeenCalled();
      expect(existingRooms[0]).toMatchObject({
        id: 11,
        roomNumber: 1,
        description: 'Novo primeiro',
      });
      expect(existingRooms[1]).toMatchObject({
        id: 12,
        roomNumber: 2,
        description: 'Novo segundo',
      });
      expect(result.availableRooms).toBe(2);
      expect(bookingRequestRepo.exists).not.toHaveBeenCalled();
    });

    it('should create missing rooms when the array grows', async () => {
      const existingRooms = [
        {
          id: 11,
          housingListingId: 1,
          roomNumber: 1,
          reserved: false,
          imageUrls: ['a.jpg'],
        },
        {
          id: 12,
          housingListingId: 1,
          roomNumber: 2,
          reserved: false,
          imageUrls: ['b.jpg'],
        },
      ];
      const housing = ownedHousing({ rooms: existingRooms, availableRooms: 2 });
      housingRepo.findOne.mockResolvedValue(housing);

      const result = await service.update(10, 1, {
        rooms: [
          {
            description: 'Primeiro',
            imageUrls: ['https://example.com/1.jpg'],
          },
          {
            description: 'Segundo',
            imageUrls: ['https://example.com/2.jpg'],
          },
          {
            description: 'Terceiro',
            imageUrls: ['https://example.com/3.jpg'],
          },
        ],
      } as any);

      expect(bookingRequestRepo.exists).not.toHaveBeenCalled();
      expect(roomRepo.create).toHaveBeenCalledTimes(1);
      expect(roomRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ roomNumber: 3 }),
      );
      expect(result.rooms).toHaveLength(3);
      expect(result.availableRooms).toBe(3);
    });

    it('should remove extra rooms that are not referenced by bookings', async () => {
      const existingRooms = [
        {
          id: 11,
          housingListingId: 1,
          roomNumber: 1,
          reserved: false,
          imageUrls: ['a.jpg'],
        },
        {
          id: 12,
          housingListingId: 1,
          roomNumber: 2,
          reserved: false,
          imageUrls: ['b.jpg'],
        },
      ];
      const housing = ownedHousing({ rooms: existingRooms, availableRooms: 2 });
      housingRepo.findOne.mockResolvedValue(housing);

      const result = await service.update(10, 1, {
        rooms: [{ description: 'Único', imageUrls: ['https://a.com/1.jpg'] }],
      } as any);

      expect(bookingRequestRepo.exists).toHaveBeenCalledWith({
        where: { housingRoomId: expect.anything() },
      });
      expect(roomRepo.delete).toHaveBeenCalledWith([12]);
      expect(result.rooms).toHaveLength(1);
      expect(result.availableRooms).toBe(1);
    });

    it('should refuse to remove rooms referenced by booking requests', async () => {
      const existingRooms = [
        {
          id: 11,
          housingListingId: 1,
          roomNumber: 1,
          reserved: false,
          imageUrls: ['a.jpg'],
        },
        {
          id: 12,
          housingListingId: 1,
          roomNumber: 2,
          reserved: false,
          imageUrls: ['b.jpg'],
        },
      ];
      const housing = ownedHousing({ rooms: existingRooms, availableRooms: 2 });
      housingRepo.findOne.mockResolvedValue(housing);
      bookingRequestRepo.exists.mockResolvedValue(true);

      await expect(
        service.update(10, 1, {
          rooms: [{ description: 'Único', imageUrls: ['https://a.com/1.jpg'] }],
        } as any),
      ).rejects.toThrow(
        'Não é possível remover quartos reservados ou com pedidos de reserva.',
      );

      expect(roomRepo.delete).not.toHaveBeenCalled();
    });

    it('should refuse to remove reserved rooms', async () => {
      const existingRooms = [
        {
          id: 11,
          housingListingId: 1,
          roomNumber: 1,
          reserved: false,
          imageUrls: ['a.jpg'],
        },
        {
          id: 12,
          housingListingId: 1,
          roomNumber: 2,
          reserved: true,
          imageUrls: ['b.jpg'],
        },
      ];
      const housing = ownedHousing({ rooms: existingRooms, availableRooms: 1 });
      housingRepo.findOne.mockResolvedValue(housing);

      await expect(
        service.update(10, 1, {
          rooms: [{ description: 'Único', imageUrls: ['https://a.com/1.jpg'] }],
        } as any),
      ).rejects.toThrow(
        'Não é possível remover quartos reservados ou com pedidos de reserva.',
      );

      expect(roomRepo.delete).not.toHaveBeenCalled();
    });

    it('should preserve reserved flags omitted from the payload and recalculate availableRooms', async () => {
      const existingRooms = [
        {
          id: 11,
          housingListingId: 1,
          roomNumber: 1,
          reserved: true,
          imageUrls: ['a.jpg'],
        },
        {
          id: 12,
          housingListingId: 1,
          roomNumber: 2,
          reserved: false,
          imageUrls: ['b.jpg'],
        },
      ];
      const housing = ownedHousing({ rooms: existingRooms, availableRooms: 1 });
      housingRepo.findOne.mockResolvedValue(housing);

      const result = await service.update(10, 1, {
        rooms: [
          { description: 'Um', imageUrls: ['https://a.com/1.jpg'] },
          { description: 'Dois', imageUrls: ['https://a.com/2.jpg'] },
        ],
      } as any);

      expect(existingRooms[0].reserved).toBe(true);
      expect(existingRooms[1].reserved).toBe(false);
      expect(result.availableRooms).toBe(1);
    });

    it('should reject a room without images on update', async () => {
      housingRepo.findOne.mockResolvedValue(ownedHousing());

      await expect(
        service.update(10, 1, {
          rooms: [{ description: 'Sem imagens' }],
        } as any),
      ).rejects.toThrow('O quarto 1 deve ter pelo menos uma imagem.');
    });

    it('should leave availableRooms untouched when rooms are omitted', async () => {
      const housing = ownedHousing({ availableRooms: 7 });
      housingRepo.findOne.mockResolvedValue(housing);

      await service.update(10, 1, { title: 'Novo' } as any);

      expect(housing.availableRooms).toBe(7);
      expect(roomRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('should pause a published housing through the unified status operation', async () => {
      const housing = {
        id: 1,
        publisherId: 10,
        status: HousingListingStatus.PUBLISHED,
      } as any;
      housingRepo.findOne.mockResolvedValue(housing);

      const res = await service.changeStatus(
        10,
        1,
        HousingListingStatus.PAUSED,
      );

      expect(res.status).toBe(HousingListingStatus.PAUSED);
    });

    it('should close a housing through the unified status operation', async () => {
      const housing = {
        id: 1,
        publisherId: 10,
        status: HousingListingStatus.PUBLISHED,
      } as any;
      housingRepo.findOne.mockResolvedValue(housing);

      const res = await service.changeStatus(
        10,
        1,
        HousingListingStatus.CLOSED,
      );

      expect(res.status).toBe(HousingListingStatus.CLOSED);
    });

    it('should keep the pause rules for incompatible states', async () => {
      housingRepo.findOne.mockResolvedValue({
        id: 1,
        publisherId: 10,
        status: HousingListingStatus.CLOSED,
      } as any);

      await expect(
        service.changeStatus(10, 1, HousingListingStatus.PAUSED),
      ).rejects.toThrow('O alojamento não está publicado.');
    });

    it('should keep the close rules for already closed housings', async () => {
      housingRepo.findOne.mockResolvedValue({
        id: 1,
        publisherId: 10,
        status: HousingListingStatus.CLOSED,
      } as any);

      await expect(
        service.changeStatus(10, 1, HousingListingStatus.CLOSED),
      ).rejects.toThrow('O alojamento já está encerrado.');
    });

    it('should reject states that cannot be assigned', async () => {
      housingRepo.findOne.mockResolvedValue({
        id: 1,
        publisherId: 10,
        status: HousingListingStatus.PUBLISHED,
      } as any);
      await expect(service.changeStatus(10, 1, 'DRAFT' as any)).rejects.toThrow(
        'A transição de estado solicitada não é permitida para este alojamento.',
      );

      await expect(
        service.changeStatus(10, 1, HousingListingStatus.EXPIRED as any),
      ).rejects.toThrow(
        'A transição de estado solicitada não é permitida para este alojamento.',
      );
    });

    it('should keep the ownership verification', async () => {
      housingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changeStatus(10, 999, HousingListingStatus.CLOSED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('expireListings', () => {
    it('marks published and paused listings past their expiry as expired', async () => {
      await service.expireListings();

      expect(housingRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.any(Object),
          expiresAt: expect.any(Object),
        }),
        { status: HousingListingStatus.EXPIRED },
      );
    });
  });
});
