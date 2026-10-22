import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HousingResponseDto } from '../dtos/housing-response.dto';
import { HousingListing } from '../entities/housing-listing.entity';
import { HousingListingStatus } from '../enums/housing-listing-status.enum';
import { HousingQueryService } from '../services/housing-query.service';

describe('HousingQueryService', () => {
  let service: HousingQueryService;

  const housingRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HousingQueryService,
        {
          provide: getRepositoryToken(HousingListing),
          useValue: housingRepo,
        },
      ],
    }).compile();

    service = module.get<HousingQueryService>(HousingQueryService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated HousingResponseDto', async () => {
      const items = [
        {
          id: 1,
          title: 'A',
          description: 'D',
          status: HousingListingStatus.PUBLISHED,
          createdAt: new Date(),
        },
      ];
      housingRepo.findAndCount.mockResolvedValue([items, 1]);

      const res = await service.findAll(1, 10);

      expect(res.items).toHaveLength(1);
      expect(res.pagination.total).toBe(1);
      expect(res.items[0]).toBeInstanceOf(HousingResponseDto);
    });
  });

  describe('findById', () => {
    it('should return HousingResponseDto when found', async () => {
      const housing = {
        id: 1,
        title: 'A',
        description: 'D',
        status: HousingListingStatus.PUBLISHED,
        municipality: 'Lisboa',
        addressLine: 'Rua A, 1',
        priceCurrency: 'EUR',
      } as any;
      housingRepo.findOne.mockResolvedValue(housing);
      const res = await service.findById(1);
      expect(res).toBeInstanceOf(HousingResponseDto);
      expect(res.id).toBe(1);
      expect(res.municipality).toBe('Lisboa');
      expect(res.addressLine).toBe('Rua A, 1');
      expect((res as any).city).toBeUndefined();
      expect((res as any).country).toBeUndefined();
      expect(res.priceCurrency).toBe('EUR');
      expect((res as any).beds).toBeUndefined();
      expect((res as any).maxGuests).toBeUndefined();
    });

    it('should throw NotFoundException when not found', async () => {
      housingRepo.findOne.mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByPublisher', () => {
    it('should return paginated housing listings for publisher', async () => {
      const items = [
        {
          id: 1,
          publisherId: 10,
          title: 'A',
          description: 'D',
          status: HousingListingStatus.PUBLISHED,
          createdAt: new Date(),
        },
        {
          id: 2,
          publisherId: 10,
          title: 'B',
          description: 'D2',
          status: HousingListingStatus.PAUSED,
          createdAt: new Date(),
        },
      ];
      housingRepo.findAndCount.mockResolvedValue([items, 2]);

      const res = await service.findAllByPublisher(10, 1, 10);

      expect(res.items).toHaveLength(2);
      expect(res.pagination.total).toBe(2);
      expect(res.items[0]).toBeInstanceOf(HousingResponseDto);
      expect(housingRepo.findAndCount).toHaveBeenCalledWith({
        where: { publisherId: 10 },
        relations: { rooms: true },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });
  });
});
