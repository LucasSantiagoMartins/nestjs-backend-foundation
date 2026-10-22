import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { JobService } from '../../services/job.service';
import { JobListing } from '../../entities/job-listing.entity';
import { JobRequirement } from '../../entities/job-requirement.entity';
import { Company } from '../../entities/company.entity';
import { JobCategoryEnum } from '../../enums/job-category.enum';
import { JobListingStatus } from '../../enums/job-listing-status.enum';
import { JobResponseDto } from '../../dtos/job-response.dto';
import { CompanyResponseDto } from '../../dtos/company-response.dto';
import { JobListingDetailsResponseDto } from '../../dtos/job-listing-details-response.dto';
import { UploadService } from '@modules/upload/services/upload.service';

describe('JobService', () => {
  let service: JobService;

  const jobRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const reqRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const companyRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        { provide: getRepositoryToken(JobListing), useValue: jobRepo },
        { provide: getRepositoryToken(JobRequirement), useValue: reqRepo },
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: UploadService,
          useValue: { markAsUsed: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a job with requirements and category', async () => {
      let createdInput: Partial<JobListing> | undefined;
      const createdJob = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 10,
        title: 'Dev',
        description: 'Work',
        category: JobCategoryEnum.TECHNOLOGY,
      } as JobListing;

      const manager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === Company) {
            return {
              findOne: jest.fn().mockResolvedValue({ id: 1, publisherId: 10 }),
            };
          }
          if (entity === JobListing) {
            return {
              create: jest.fn((input) => {
                createdInput = input;
                return { ...createdJob, ...input, requirements: [] };
              }),
              save: jest.fn().mockImplementation(async (job) => ({
                ...job,
                id: '123e4567-e89b-12d3-a456-426614174000',
                requirements: [],
              })),
            };
          }
          if (entity === JobRequirement) {
            return {
              create: jest.fn((d) => d),
              save: jest.fn().mockResolvedValue([{ id: 5 }]),
            };
          }
          return undefined;
        }),
      };

      mockDataSource.transaction.mockImplementation(async (cb) => cb(manager));

      const dto = {
        title: 'Dev',
        description: 'Work',
        expiresAt: '2099-01-01T00:00:00.000Z',
        requirements: [{ type: 'SKILL', description: 'TS', required: true }],
        category: JobCategoryEnum.TECHNOLOGY,
      } as any;

      const result = await service.create(10, dto);

      expect(result).toBeDefined();
      expect(result.userId).toBe(10);
      expect(result.category).toBe(JobCategoryEnum.TECHNOLOGY);
      expect(createdInput).toMatchObject({
        status: JobListingStatus.PUBLISHED,
        publishedAt: expect.any(Date),
        expiresAt: expect.any(Date),
      });
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated JobResponseDto', async () => {
      const items = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'A',
          description: 'D',
          status: JobListingStatus.PUBLISHED,
          requirements: [],
          category: JobCategoryEnum.TECHNOLOGY,
          createdAt: new Date(),
        },
      ];
      jobRepo.findAndCount.mockResolvedValue([items, 1]);

      const res = await service.findAll(1, 10);

      expect(res.items).toHaveLength(1);
      expect(res.pagination.total).toBe(1);
      expect(res.items[0]).toBeInstanceOf(JobResponseDto);
    });
  });

  describe('findById', () => {
    it('should return JobResponseDto when found', async () => {
      const job = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 10,
        title: 'A',
        description: 'D',
        status: JobListingStatus.PUBLISHED,
        requirements: [],
        category: JobCategoryEnum.TECHNOLOGY,
      } as any;
      jobRepo.findOne.mockResolvedValue(job);
      const res = await service.findById(
        '123e4567-e89b-12d3-a456-426614174000',
      );
      expect(res).toBeInstanceOf(JobListingDetailsResponseDto);
      expect(res.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should throw NotFoundException when not found', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';

    it('pauses a published job', async () => {
      const job = { id, userId: 10, status: JobListingStatus.PUBLISHED } as any;
      jobRepo.findOne.mockResolvedValue(job);
      jobRepo.save.mockImplementation(async (saved) => saved);

      const result = await service.updateStatus(
        10,
        id,
        JobListingStatus.PAUSED,
      );

      expect(result.status).toBe(JobListingStatus.PAUSED);
      expect(jobRepo.save).toHaveBeenCalledWith(job);
    });

    it('closes a job that is not already closed', async () => {
      const job = { id, userId: 10, status: JobListingStatus.PAUSED } as any;
      jobRepo.findOne.mockResolvedValue(job);
      jobRepo.save.mockImplementation(async (saved) => saved);

      const result = await service.updateStatus(
        10,
        id,
        JobListingStatus.CLOSED,
      );

      expect(result.status).toBe(JobListingStatus.CLOSED);
    });

    it('only pauses published jobs', async () => {
      jobRepo.findOne.mockResolvedValue({
        id,
        userId: 10,
        status: JobListingStatus.CLOSED,
      });

      await expect(
        service.updateStatus(10, id, JobListingStatus.PAUSED),
      ).rejects.toThrow('A vaga não está publicada.');
    });

    it('does not close a job twice', async () => {
      jobRepo.findOne.mockResolvedValue({
        id,
        userId: 10,
        status: JobListingStatus.CLOSED,
      });

      await expect(
        service.updateStatus(10, id, JobListingStatus.CLOSED),
      ).rejects.toThrow('A vaga já está encerrada.');
    });
  });

  describe('update & remove ownership', () => {
    it('should throw when updating job not owned', async () => {
      jobRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update(10, '123e4567-e89b-12d3-a456-426614174000', {
          title: 'novo',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete when owner', async () => {
      jobRepo.findOne.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 10,
        title: 'x',
        description: 'y',
      } as any);
      jobRepo.delete.mockResolvedValue({});
      await expect(
        service.remove(10, '123e4567-e89b-12d3-a456-426614174000'),
      ).resolves.toBeUndefined();
      expect(jobRepo.delete).toHaveBeenCalledWith({
        id: '123e4567-e89b-12d3-a456-426614174000',
      });
    });
  });

  describe('createCompany', () => {
    it('should throw ConflictException if user already represents a company', async () => {
      companyRepo.findOne.mockResolvedValue({ id: 1, publisherId: 1 });
      await expect(
        service.createCompany(1, { name: 'Empresa X' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and return company response dto if user does not have one', async () => {
      companyRepo.findOne.mockResolvedValue(null);
      const companyMock = { id: 1, name: 'Empresa X', publisherId: 1 };
      companyRepo.create.mockReturnValue(companyMock);
      companyRepo.save.mockResolvedValue(companyMock);

      jest
        .spyOn(CompanyResponseDto, 'fromEntity')
        .mockReturnValue(companyMock as any);

      const result = await service.createCompany(1, {
        name: 'Empresa X',
      } as any);

      expect(result).toBeDefined();
      expect(companyRepo.create).toHaveBeenCalledWith({
        name: 'Empresa X',
        publisherId: 1,
      });
      expect(companyRepo.save).toHaveBeenCalledWith(companyMock);
    });
  });

  describe('getJobListingCompany', () => {
    it('should throw NotFoundException if job listing is not found', async () => {
      jobRepo.findOne.mockResolvedValue(null);

      await expect(service.getJobListingCompany('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if job has no associated company', async () => {
      jobRepo.findOne.mockResolvedValue({ id: '123', company: null });

      await expect(service.getJobListingCompany('123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return company response dto when listing and company exist', async () => {
      const mockCompany = { id: 1, name: 'Tech Corp' };
      jobRepo.findOne.mockResolvedValue({ id: '123', company: mockCompany });

      jest
        .spyOn(CompanyResponseDto, 'fromEntity')
        .mockReturnValue(mockCompany as any);

      const result = await service.getJobListingCompany('123');

      expect(result).toEqual(mockCompany);
    });
  });

  describe('findCompanyByPublisher', () => {
    it('should throw NotFoundException if company is not found for publisher', async () => {
      companyRepo.findOne.mockResolvedValue(null);

      await expect(service.findCompanyByPublisher(1, 99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return company response dto if found', async () => {
      const mockCompany = { id: 1, publisherId: 1, name: 'My Company' };
      companyRepo.findOne.mockResolvedValue(mockCompany);

      jest
        .spyOn(CompanyResponseDto, 'fromEntity')
        .mockReturnValue(mockCompany as any);

      const result = await service.findCompanyByPublisher(1, 1);

      expect(result).toEqual(mockCompany);
      expect(companyRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1, publisherId: 1 },
      });
    });
  });

  describe('expireListings', () => {
    it('marks published and paused listings past their expiry as expired', async () => {
      await service.expireListings();

      expect(jobRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.any(Object),
          expiresAt: expect.any(Object),
        }),
        { status: JobListingStatus.EXPIRED },
      );
    });
  });
});
