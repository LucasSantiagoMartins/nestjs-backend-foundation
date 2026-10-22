import { HashPasswordUtils } from '@backend-foundation/common';
import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { QUEUES } from '@infra/queue/queue.constants';
import { User } from '@modules/user/entities/user.entity';
import { UserService } from '@modules/user/services/user.service';
import { getQueueToken } from '@nestjs/bullmq';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { DataSource } from 'typeorm';
import { AuthCookieService } from '../../services/auth-cookie.service';
import { AuthService } from '../../services/auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let compareSpy: jest.SpyInstance;

  const mockUserService = {
    findByEmailOrPhone: jest.fn(),
    createFromGoogle: jest.fn(),
    findByIdWithPassword: jest.fn(),
    updatePassword: jest.fn(),
    findByEmailForPasswordRecovery: jest.fn(),
  };
  const mockMailQueue = { add: jest.fn().mockResolvedValue(undefined) };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockAuthCookieService = {
    setAuthCookie: jest.fn(),
    clearAuthCookie: jest.fn(),
  };

  const mockAppLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockDataSource = { transaction: jest.fn() };
  const mockConfigService = {
    get: jest.fn().mockReturnValue(10),
    getOrThrow: jest.fn().mockReturnValue('unit-test-secret'),
  };

  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AuthCookieService,
          useValue: mockAuthCookieService,
        },
        {
          provide: AppLogger,
          useValue: mockAppLogger,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getQueueToken(QUEUES.MAIL), useValue: mockMailQueue },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    compareSpy = jest.spyOn(HashPasswordUtils, 'compare');

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('changePassword', () => {
    it('updates the password after verifying the current password', async () => {
      mockUserService.findByIdWithPassword.mockResolvedValue({
        id: 5,
        password: 'current-hash',
      });
      compareSpy.mockResolvedValue(true);

      await service.changePassword(5, {
        currentPassword: 'Current123',
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(compareSpy).toHaveBeenCalledWith('Current123', 'current-hash');
      expect(mockUserService.updatePassword).toHaveBeenCalledWith(
        5,
        'NewPassword123',
      );
      expect(mockMailQueue.add).not.toHaveBeenCalled();
    });

    it('rejects an incorrect current password without updating the account', async () => {
      mockUserService.findByIdWithPassword.mockResolvedValue({
        id: 5,
        password: 'current-hash',
      });
      compareSpy.mockResolvedValue(false);

      await expect(
        service.changePassword(5, {
          currentPassword: 'wrong',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUserService.updatePassword).not.toHaveBeenCalled();
    });

    it('rejects the same password without updating the account', async () => {
      mockUserService.findByIdWithPassword.mockResolvedValue({
        id: 5,
        password: 'current-hash',
      });
      compareSpy.mockResolvedValue(true);

      await expect(
        service.changePassword(5, {
          currentPassword: 'SamePassword123',
          newPassword: 'SamePassword123',
          confirmPassword: 'SamePassword123',
        }),
      ).rejects.toThrow('A nova senha deve ser diferente');

      expect(mockUserService.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    const user = {
      id: 21,
      email: 'person@example.com',
      provider: 'LOCAL',
      password: 'existing-hash',
      profile: { fullName: 'Test Person' },
    };

    it('creates a hashed expiring code and queues the reset email', async () => {
      const recoveryRepo = {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn((values) => values),
        save: jest
          .fn()
          .mockImplementation(async (value) => ({ ...value, id: 33 })),
        createQueryBuilder: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue(undefined),
        })),
      };
      const userRepo = { findOne: jest.fn().mockResolvedValue(user) };
      const manager = {
        getRepository: jest.fn((entity) =>
          entity === User ? userRepo : recoveryRepo,
        ),
      };
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(manager),
      );
      mockUserService.findByEmailForPasswordRecovery.mockResolvedValue(user);

      await service.forgotPassword({ email: ' PERSON@example.com ' });

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: user.id },
        lock: { mode: 'pessimistic_write' },
      });
      expect(recoveryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user,
          code: expect.any(Number),
          expiresAt: expect.any(Date),
          usedAt: null,
          attempts: 0,
        }),
      );
      const savedCode = recoveryRepo.save.mock.calls[0][0];
      expect(savedCode.code).toBeGreaterThanOrEqual(0);
      expect(savedCode.code).toBeLessThan(100_000);
      expect(mockMailQueue.add).toHaveBeenCalledWith(
        'send_email',
        expect.objectContaining({
          to: user.email,
          context: expect.objectContaining({
            userName: 'Test Person',
            code: expect.stringMatching(/^\d{5}$/),
            validityMinutes: 10,
          }),
        }),
      );
    });

    it('returns without revealing an unknown email or queueing a message', async () => {
      mockUserService.findByEmailForPasswordRecovery.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'missing@example.com' }),
      ).resolves.toBeUndefined();

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
      expect(mockMailQueue.add).not.toHaveBeenCalled();
    });

    it('limits code requests to three per hour', async () => {
      const recoveryRepo = { count: jest.fn().mockResolvedValue(3) };
      const manager = {
        getRepository: jest.fn((entity) =>
          entity === User
            ? { findOne: jest.fn().mockResolvedValue(user) }
            : recoveryRepo,
        ),
      };
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(manager),
      );
      mockUserService.findByEmailForPasswordRecovery.mockResolvedValue(user);

      await service.forgotPassword({ email: user.email });

      expect(mockMailQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const code = '01234';
    const recovery = {
      id: 44,
      code: Number(code),
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      user: { id: 21, email: 'person@example.com' },
    };

    const setupResetTransaction = (recoveryRecord: any) => {
      const recoveryQuery = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(recoveryRecord),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      };
      const recoveryRepo = {
        createQueryBuilder: jest.fn(() => recoveryQuery),
        save: jest.fn().mockImplementation(async (value) => value),
      };
      const userRepo = {
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        findOne: jest.fn().mockResolvedValue({
          ...recovery.user,
          profile: { fullName: 'Test Person' },
        }),
      };
      const manager = {
        getRepository: jest.fn((entity) =>
          entity === User ? userRepo : recoveryRepo,
        ),
      };
      mockDataSource.transaction.mockImplementation((callback) =>
        callback(manager),
      );
      return { manager, recoveryQuery, recoveryRepo, userRepo };
    };

    it('updates the password atomically, consumes codes, then queues confirmation', async () => {
      const { recoveryQuery, userRepo } = setupResetTransaction(recovery);
      const hashSpy = jest
        .spyOn(HashPasswordUtils, 'hash')
        .mockResolvedValue('new-password-hash');

      await service.resetPassword({
        email: 'PERSON@example.com',
        code,
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      });

      expect(recoveryQuery.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
        undefined,
        ['recovery'],
      );
      expect(hashSpy).toHaveBeenCalledWith('NewPassword123');
      expect(userRepo.update).toHaveBeenCalledWith(21, {
        password: 'new-password-hash',
      });
      expect(mockMailQueue.add).toHaveBeenCalledWith(
        'send_email',
        expect.objectContaining({
          to: 'person@example.com',
          context: expect.objectContaining({ userName: 'Test Person' }),
        }),
        expect.objectContaining({
          jobId: expect.stringMatching(/^password-recovered-/),
        }),
      );
    });

    it('rejects an incorrect code and records the failed attempt', async () => {
      const wrongCodeRecovery = { ...recovery, attempts: 2 };
      const { recoveryRepo, userRepo } =
        setupResetTransaction(wrongCodeRecovery);

      await expect(
        service.resetPassword({
          email: 'person@example.com',
          code: '09999',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        }),
      ).rejects.toThrow('Código inválido ou expirado');

      expect(wrongCodeRecovery.attempts).toBe(3);
      expect(recoveryRepo.save).toHaveBeenCalledWith(wrongCodeRecovery);
      expect(userRepo.update).not.toHaveBeenCalled();
      expect(mockMailQueue.add).not.toHaveBeenCalled();
    });

    it('rejects expired codes and marks them as used', async () => {
      const expiredRecovery = {
        ...recovery,
        expiresAt: new Date(Date.now() - 60_000),
      };
      const { recoveryRepo, userRepo } = setupResetTransaction(expiredRecovery);

      await expect(
        service.resetPassword({
          email: 'person@example.com',
          code,
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        }),
      ).rejects.toThrow('Código inválido ou expirado');

      expect(expiredRecovery.usedAt).toBeInstanceOf(Date);
      expect(recoveryRepo.save).toHaveBeenCalledWith(expiredRecovery);
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('rejects reuse after a successful reset and locks the recovery record', async () => {
      const singleUseRecovery: any = { ...recovery, usedAt: null };
      const { recoveryQuery } = setupResetTransaction(singleUseRecovery);
      recoveryQuery.getOne.mockImplementation(async () =>
        singleUseRecovery.usedAt ? null : singleUseRecovery,
      );
      recoveryQuery.execute.mockImplementation(async () => {
        singleUseRecovery.usedAt = new Date();
      });
      jest
        .spyOn(HashPasswordUtils, 'hash')
        .mockResolvedValue('new-password-hash');

      const request = {
        email: 'person@example.com',
        code,
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      };
      await service.resetPassword(request);
      await expect(service.resetPassword(request)).rejects.toThrow(
        'Código inválido ou expirado',
      );

      expect(recoveryQuery.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
        undefined,
        ['recovery'],
      );
      expect(singleUseRecovery.usedAt).toBeInstanceOf(Date);
      expect(mockMailQueue.add).toHaveBeenCalledTimes(1);
    });

    it('invalidates a code after five incorrect attempts', async () => {
      const limitedRecovery = { ...recovery, attempts: 4 };
      const { recoveryRepo } = setupResetTransaction(limitedRecovery);

      await expect(
        service.resetPassword({
          email: 'person@example.com',
          code: '09999',
          newPassword: 'NewPassword123',
          confirmPassword: 'NewPassword123',
        }),
      ).rejects.toThrow('Código inválido ou expirado');

      expect(limitedRecovery.attempts).toBe(5);
      expect(limitedRecovery.usedAt).toBeInstanceOf(Date);
      expect(recoveryRepo.save).toHaveBeenCalledWith(limitedRecovery);
    });

    it('allows only one successful reset when the same code is submitted concurrently', async () => {
      const concurrentRecovery: any = { ...recovery, usedAt: null };
      const { recoveryQuery } = setupResetTransaction(concurrentRecovery);
      recoveryQuery.getOne.mockImplementation(async () =>
        concurrentRecovery.usedAt ? null : concurrentRecovery,
      );
      recoveryQuery.execute.mockImplementation(async () => {
        concurrentRecovery.usedAt = new Date();
      });
      jest
        .spyOn(HashPasswordUtils, 'hash')
        .mockResolvedValue('new-password-hash');

      let transactionLock = Promise.resolve();
      mockDataSource.transaction.mockImplementation(async (callback) => {
        const previous = transactionLock;
        let release: () => void = () => undefined;
        transactionLock = new Promise<void>((resolve) => {
          release = resolve;
        });
        await previous;
        try {
          return await callback({
            getRepository: (entity: Function) =>
              entity === User
                ? {
                    update: jest.fn().mockResolvedValue({ affected: 1 }),
                    findOne: jest.fn().mockResolvedValue(recovery.user),
                  }
                : {
                    createQueryBuilder: () => recoveryQuery,
                    save: jest.fn().mockImplementation(async (value) => value),
                  },
          });
        } finally {
          release();
        }
      });

      const request = {
        email: 'person@example.com',
        code,
        newPassword: 'NewPassword123',
        confirmPassword: 'NewPassword123',
      };
      const results = await Promise.allSettled([
        service.resetPassword(request),
        service.resetPassword(request),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
      expect(mockMailQueue.add).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('should login successfully and set auth cookie', async () => {
      const user = {
        id: 'user-1',
        role: 'USER',
        password: 'hashed-password',
      };

      mockUserService.findByEmailOrPhone.mockResolvedValue(user);
      compareSpy.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('fake-jwt-token');

      await service.login(
        {
          identifier: 'test@email.com',
          password: '123456',
        },
        mockResponse as Response,
      );

      expect(mockUserService.findByEmailOrPhone).toHaveBeenCalledWith(
        'test@email.com',
      );

      expect(compareSpy).toHaveBeenCalledWith('123456', 'hashed-password');

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: user.id,
          role: user.role,
        },
        {
          expiresIn: '7d',
        },
      );

      expect(mockAuthCookieService.setAuthCookie).toHaveBeenCalledWith(
        mockResponse,
        'fake-jwt-token',
      );
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockUserService.findByEmailOrPhone.mockResolvedValue(null);

      await expect(
        service.login(
          {
            identifier: 'test@email.com',
            password: '123456',
          },
          mockResponse as Response,
        ),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login(
          {
            identifier: 'test@email.com',
            password: '123456',
          },
          mockResponse as Response,
        ),
      ).rejects.toThrow('E-mail, telefone ou senha incorretos');

      expect(mockUserService.findByEmailOrPhone).toHaveBeenCalledWith(
        'test@email.com',
      );

      expect(compareSpy).not.toHaveBeenCalled();

      expect(mockJwtService.sign).not.toHaveBeenCalled();
      expect(mockAuthCookieService.setAuthCookie).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user has no password', async () => {
      const user = {
        id: 'user-1',
        role: 'USER',
        password: null,
      };

      mockUserService.findByEmailOrPhone.mockResolvedValue(user);

      await expect(
        service.login(
          {
            identifier: 'test@email.com',
            password: '123456',
          },
          mockResponse as Response,
        ),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login(
          {
            identifier: 'test@email.com',
            password: '123456',
          },
          mockResponse as Response,
        ),
      ).rejects.toThrow('E-mail, telefone ou senha incorretos');

      expect(compareSpy).not.toHaveBeenCalled();

      expect(mockJwtService.sign).not.toHaveBeenCalled();
      expect(mockAuthCookieService.setAuthCookie).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const user = {
        id: 'user-1',
        role: 'USER',
        password: 'hashed-password',
      };

      mockUserService.findByEmailOrPhone.mockResolvedValue(user);
      compareSpy.mockResolvedValue(false);

      await expect(
        service.login(
          {
            identifier: 'test@email.com',
            password: 'wrong-password',
          },
          mockResponse as Response,
        ),
      ).rejects.toThrow(UnauthorizedException);

      await expect(
        service.login(
          {
            identifier: 'test@email.com',
            password: 'wrong-password',
          },
          mockResponse as Response,
        ),
      ).rejects.toThrow('E-mail, telefone ou senha incorretos');

      expect(compareSpy).toHaveBeenCalledWith(
        'wrong-password',
        'hashed-password',
      );

      expect(mockJwtService.sign).not.toHaveBeenCalled();
      expect(mockAuthCookieService.setAuthCookie).not.toHaveBeenCalled();
    });

    it('should generate JWT with user id, role, then set cookie when authentication succeeds', async () => {
      const user = {
        id: 'user-123',
        role: 'PUBLISHER',
        password: 'hashed-password',
      };

      mockUserService.findByEmailOrPhone.mockResolvedValue(user);
      compareSpy.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token-123');

      await service.login(
        {
          identifier: 'publisher@email.com',
          password: 'correct-password',
        },
        mockResponse as Response,
      );

      expect(compareSpy).toHaveBeenCalledWith(
        'correct-password',
        'hashed-password',
      );

      expect(mockJwtService.sign).toHaveBeenCalledTimes(1);

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'user-123',
          role: 'PUBLISHER',
        },
        {
          expiresIn: '7d',
        },
      );

      expect(mockAuthCookieService.setAuthCookie).toHaveBeenCalledWith(
        mockResponse,
        'jwt-token-123',
      );
    });
  });

  describe('logout', () => {
    it('should clear the auth cookie', async () => {
      await service.logout(mockResponse as Response);

      expect(mockAuthCookieService.clearAuthCookie).toHaveBeenCalledWith(
        mockResponse,
      );
    });
  });

  describe('loginWithGoogle', () => {
    it('should generate JWT for google user and set auth cookie', async () => {
      const googleUser = {
        id: 'google-user-1',
        role: 'USER',
      };

      mockJwtService.sign.mockReturnValue('google-jwt-token');

      await service.loginWithGoogle(
        googleUser as any,
        mockResponse as Response,
      );

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'google-user-1',
          role: 'USER',
        },
        {
          expiresIn: '7d',
        },
      );

      expect(mockAuthCookieService.setAuthCookie).toHaveBeenCalledWith(
        mockResponse,
        'google-jwt-token',
      );
    });
  });
});
