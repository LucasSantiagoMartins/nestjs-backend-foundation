import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HousingBookingRequest } from '../entities/housing-booking-request.entity';
import { HousingListing } from '../entities/housing-listing.entity';
import { HousingBookingRequestQueryService } from '../services/housing-booking-request-query.service';

describe('HousingBookingRequestQueryService', () => {
  let service: HousingBookingRequestQueryService;

  const bookingRequestRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const housingRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HousingBookingRequestQueryService,
        {
          provide: getRepositoryToken(HousingBookingRequest),
          useValue: bookingRequestRepo,
        },
        {
          provide: getRepositoryToken(HousingListing),
          useValue: housingRepo,
        },
      ],
    }).compile();

    service = module.get<HousingBookingRequestQueryService>(
      HousingBookingRequestQueryService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listMine', () => {
    it('returns the booking requests of the user', async () => {
      bookingRequestRepo.find.mockResolvedValue([
        { id: 1, userId: 10 },
        { id: 2, userId: 10 },
      ] as any);

      const result = await service.listMine(10);

      expect(result).toHaveLength(2);
      expect(bookingRequestRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 10 } }),
      );
    });

    it('returns an empty list when there are no booking requests', async () => {
      bookingRequestRepo.find.mockResolvedValue([]);

      const result = await service.listMine(10);

      expect(result).toEqual([]);
    });
  });

  describe('findMineById', () => {
    it('returns the booking request when it belongs to the user', async () => {
      bookingRequestRepo.findOne.mockResolvedValue({
        id: 1,
        userId: 10,
      } as any);

      const result = await service.findMineById(10, 1);

      expect(result.id).toBe(1);
      expect(bookingRequestRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, userId: 10 } }),
      );
    });

    it('throws NotFoundException when the booking request is not from the user', async () => {
      bookingRequestRepo.findOne.mockResolvedValue(null);

      await expect(service.findMineById(10, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listForPublisher', () => {
    it('returns an empty list when the publisher has no listings', async () => {
      housingRepo.find.mockResolvedValue([]);

      const result = await service.listForPublisher(99);

      expect(result).toEqual([]);
      expect(bookingRequestRepo.find).not.toHaveBeenCalled();
    });

    it('returns booking requests of the publisher listings', async () => {
      housingRepo.find.mockResolvedValue([{ id: 7 }, { id: 8 }] as any);
      bookingRequestRepo.find.mockResolvedValue([
        { id: 1, housingListingId: 7 },
        { id: 2, housingListingId: 8 },
      ] as any);

      const result = await service.listForPublisher(99);

      expect(result).toHaveLength(2);
      expect(bookingRequestRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [{ housingListingId: 7 }, { housingListingId: 8 }],
        }),
      );
    });
  });

  describe('findForPublisher', () => {
    it('returns the booking request of a listing of the publisher', async () => {
      bookingRequestRepo.findOne.mockResolvedValue({
        id: 1,
        housingListingId: 7,
      } as any);
      housingRepo.findOne.mockResolvedValue({ id: 7, publisherId: 99 } as any);

      const result = await service.findForPublisher(99, 1);

      expect(result.id).toBe(1);
    });

    it('throws ForbiddenException for booking requests of another publisher', async () => {
      bookingRequestRepo.findOne.mockResolvedValue({
        id: 1,
        housingListingId: 7,
      } as any);
      housingRepo.findOne.mockResolvedValue({ id: 7, publisherId: 100 } as any);

      await expect(service.findForPublisher(99, 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when the booking request does not exist', async () => {
      bookingRequestRepo.findOne.mockResolvedValue(null);

      await expect(service.findForPublisher(99, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the listing does not exist', async () => {
      bookingRequestRepo.findOne.mockResolvedValue({
        id: 1,
        housingListingId: 7,
      } as any);
      housingRepo.findOne.mockResolvedValue(null);

      await expect(service.findForPublisher(99, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
