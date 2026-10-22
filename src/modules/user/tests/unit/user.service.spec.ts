import { HashPasswordUtils, UserRole } from '@backend-foundation/common';
import { QUEUES } from '@infra/queue/queue.constants';
import { HousingService } from '@modules/housing/services/housing.service';
import { UploadService } from '@modules/upload/services/upload.service';
import { ProfileService } from '@modules/user/services/profile.service';
import { UserService } from '@modules/user/services/user.service';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

describe('UserService', () => {
  let service: UserService;
  let hashSpy: jest.SpyInstance;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const manager = { getRepository: jest.fn(() => mockUserRepository) };
  const mockDataSource = {
    transaction: jest.fn((callback) => callback(manager)),
  };
  const mockProfileService = { createProfile: jest.fn() };
  const mockHousingService = {
    hasPendingBookingRequestsForUser: jest.fn().mockResolvedValue(false),
    removeUserData: jest.fn().mockResolvedValue(undefined),
  };
  const mockMailQueue = { add: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: 'UserRepository',
          useValue: mockUserRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ProfileService, useValue: mockProfileService },
        { provide: UploadService, useValue: {} },
        { provide: HousingService, useValue: mockHousingService },
        {
          provide: getQueueToken(QUEUES.MAIL),
          useValue: mockMailQueue,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    hashSpy = jest.spyOn(HashPasswordUtils, 'hash');
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('1. should register user successfully with email and phone', async () => {
      const data = {
        fullName: 'Lucas Santiago',
        email: 'lucas@email.com',
        phoneNumber: '923000000',
        password: '123456',
        role: UserRole.USER,
      };

      const hashedPassword = 'hashed-password';
      const createdUser = { id: 1, ...data, password: hashedPassword };

      mockUserRepository.findOne.mockResolvedValue(null);
      hashSpy.mockResolvedValue(hashedPassword);
      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);

      const result = await service.register(data);

      expect(result).toEqual(createdUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(2);
      expect(hashSpy).toHaveBeenCalledWith(data.password);
      expect(mockUserRepository.save).toHaveBeenCalledWith(createdUser);
    });

    it('2. should throw BadRequestException when email already exists', async () => {
      const data = {
        fullName: 'Lucas Santiago',
        email: 'lucas@email.com',
        password: '123456',
        role: UserRole.USER,
      };

      mockUserRepository.findOne.mockResolvedValue({
        id: 1,
        email: data.email,
      });

      await expect(service.register(data)).rejects.toThrow(BadRequestException);
      await expect(service.register(data)).rejects.toThrow(
        'O e-mail já está registado',
      );

      expect(hashSpy).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findByEmailOrPhone', () => {
    it('3. should find user by email or phone using query builder', async () => {
      const user = {
        id: 1,
        email: 'lucas@email.com',
        phoneNumber: '923000000',
        password: 'hashed-password',
        role: UserRole.PUBLISHER,
      };

      const queryBuilder = {
        addSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findByEmailOrPhone('lucas@email.com');

      expect(result).toEqual(user);
      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith(
        'user',
      );
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('user.password');
      expect(queryBuilder.getOne).toHaveBeenCalledTimes(1);
    });
  });
});
