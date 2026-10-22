import { HashPasswordUtils } from '@backend-foundation/common';
import { EmailTemplateType } from '@backend-foundation/common/enums/email-template-type.enum';
import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { QUEUES } from '@infra/queue/queue.constants';
import { User } from '@modules/user/entities/user.entity';
import { UserService } from '@modules/user/services/user.service';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Queue } from 'bullmq';
import { randomInt } from 'crypto';
import { Response } from 'express';
import { DataSource, MoreThan } from 'typeorm';
import { ChangePasswordDto } from '../dtos/change-password.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { LoginDto } from '../dtos/login.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { PasswordRecoveryCode } from '../entities/password-recovery-code.entity';
import { AuthCookieService } from './auth-cookie.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly authCookieService: AuthCookieService,
    private readonly logger: AppLogger,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    @InjectQueue(QUEUES.MAIL) private readonly mailQueue: Queue,
  ) {}

  async changePassword(userId: number, data: ChangePasswordDto): Promise<void> {
    if (data.newPassword !== data.confirmPassword) {
      throw new BadRequestException(
        'A confirmação deve ser igual à nova senha',
      );
    }
    const user = await this.userService.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('Utilizador não encontrado');
    }
    if (!user.password) {
      throw new BadRequestException(
        'Esta conta não possui uma senha local configurada',
      );
    }

    const currentIsValid = await HashPasswordUtils.compare(
      data.currentPassword,
      user.password,
    );
    if (!currentIsValid) {
      throw new UnauthorizedException('A senha atual está incorreta');
    }

    if (data.newPassword === data.currentPassword) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual',
      );
    }

    await this.userService.updatePassword(user.id, data.newPassword);
  }

  async forgotPassword(data: ForgotPasswordDto): Promise<void> {
    const email = data.email.trim().toLowerCase();
    const user = await this.userService.findByEmailForPasswordRecovery(email);
    if (!user || user.provider !== 'LOCAL' || !user.password || !user.email) {
      return;
    }

    const configuredValidity = Number(
      this.config.get<string | number>('PASSWORD_RESET_CODE_TTL_MINUTES', 10),
    );
    const validityMinutes =
      Number.isInteger(configuredValidity) && configuredValidity > 0
        ? configuredValidity
        : 10;
    const code = randomInt(0, 100_000);
    const now = new Date();
    const recoveryCode = await this.dataSource.transaction(async (manager) => {
      const lockedUser = await manager.getRepository(User).findOne({
        where: { id: user.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedUser) {
        return null;
      }

      const recentRequests = await manager
        .getRepository(PasswordRecoveryCode)
        .count({
          where: {
            user: { id: user.id },
            createdAt: MoreThan(new Date(now.getTime() - 60 * 60 * 1000)),
          },
        });
      if (recentRequests >= 3) {
        return null;
      }

      await manager
        .getRepository(PasswordRecoveryCode)
        .createQueryBuilder()
        .update()
        .set({ usedAt: now })
        .where('user_id = :userId AND used_at IS NULL', { userId: user.id })
        .execute();

      return manager.getRepository(PasswordRecoveryCode).save(
        manager.getRepository(PasswordRecoveryCode).create({
          user: lockedUser,
          code,
          expiresAt: new Date(now.getTime() + validityMinutes * 60 * 1000),
          usedAt: null,
          attempts: 0,
        }),
      );
    });

    if (recoveryCode) {
      await this.mailQueue.add('send_email', {
        to: user.email,
        template: EmailTemplateType.PASSWORD_RESET_CODE,
        context: {
          userName: user.profile?.fullName ?? 'Utilizador',
          code: String(code).padStart(5, '0'),
          validityMinutes,
        },
      });
    }
  }

  async resetPassword(data: ResetPasswordDto): Promise<void> {
    if (data.newPassword !== data.confirmPassword) {
      throw new BadRequestException(
        'A confirmação deve ser igual à nova senha',
      );
    }

    const email = data.email.trim().toLowerCase();
    const code = Number(data.code);
    const recoveredAt = new Date();
    const result = await this.dataSource.transaction(async (manager) => {
      const recovery = await manager
        .getRepository(PasswordRecoveryCode)
        .createQueryBuilder('recovery')
        .innerJoinAndSelect('recovery.user', 'user')
        .where('LOWER(user.email) = LOWER(:email)', { email })
        .andWhere('recovery.used_at IS NULL')
        .orderBy('recovery.created_at', 'DESC')
        .addOrderBy('recovery.id', 'DESC')
        .setLock('pessimistic_write', undefined, ['recovery'])
        .getOne();

      if (!recovery || recovery.expiresAt <= recoveredAt) {
        if (recovery) {
          recovery.usedAt = recoveredAt;
          await manager.getRepository(PasswordRecoveryCode).save(recovery);
        }
        return { recoveredUser: null };
      }

      if (recovery.attempts >= 5) {
        recovery.usedAt = recoveredAt;
        await manager.getRepository(PasswordRecoveryCode).save(recovery);
        return { recoveredUser: null };
      }

      if (recovery.code !== code) {
        recovery.attempts += 1;
        if (recovery.attempts >= 5) {
          recovery.usedAt = recoveredAt;
        }
        await manager.getRepository(PasswordRecoveryCode).save(recovery);
        return { recoveredUser: null };
      }

      const newPasswordHash = await HashPasswordUtils.hash(data.newPassword);
      await manager.getRepository(User).update(recovery.user.id, {
        password: newPasswordHash,
      });
      await manager
        .getRepository(PasswordRecoveryCode)
        .createQueryBuilder()
        .update()
        .set({ usedAt: recoveredAt })
        .where('user_id = :userId AND used_at IS NULL', {
          userId: recovery.user.id,
        })
        .execute();

      const recoveredUser = await manager.getRepository(User).findOne({
        where: { id: recovery.user.id },
        relations: { profile: true },
      });
      return { recoveredUser: recoveredUser ?? recovery.user };
    });

    if (!result.recoveredUser) {
      throw new BadRequestException('Código inválido ou expirado');
    }

    if (result.recoveredUser.email) {
      try {
        await this.mailQueue.add(
          'send_email',
          {
            to: result.recoveredUser.email,
            template: EmailTemplateType.PASSWORD_RECOVERED,
            context: {
              userName: result.recoveredUser.profile?.fullName ?? 'Utilizador',
              recoveredAt: recoveredAt.toISOString(),
            },
          },
          {
            jobId: `password-recovered-${result.recoveredUser.id}-${recoveredAt.getTime()}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      } catch (error) {
        this.logger.warn({
          msg: 'Não foi possível colocar o email de confirmação de senha na fila',
          action: 'resetPassword',
          service: AuthService.name,
          userId: result.recoveredUser.id,
          error,
        });
      }
    }
  }

  async login(data: LoginDto, res: Response): Promise<void> {
    const identifier = data.identifier.trim();
    const GENERIC_ERROR = 'E-mail, telefone ou senha incorretos';

    try {
      const user = await this.userService.findByEmailOrPhone(identifier);

      if (!user) {
        this.logger.warn({
          msg: 'Login failed - user not found',
          action: 'AUTH_LOGIN_FAILED',
          service: 'Auth',
          data: { identifier },
        });
        throw new UnauthorizedException(GENERIC_ERROR);
      }

      if (!user.password) {
        this.logger.warn({
          msg: 'Login failed - user has no password configured',
          action: 'AUTH_LOGIN_FAILED',
          service: 'Auth',
          userId: user.id,
        });
        throw new UnauthorizedException(GENERIC_ERROR);
      }

      const isValid = await HashPasswordUtils.compare(
        data.password,
        user.password,
      );

      if (!isValid) {
        this.logger.warn({
          msg: 'Login failed - invalid password',
          action: 'AUTH_LOGIN_FAILED',
          service: 'Auth',
          userId: user.id,
        });
        throw new UnauthorizedException(GENERIC_ERROR);
      }

      const token = this.generateAccessToken(user);
      this.authCookieService.setAuthCookie(res, token);
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      this.logger.error({
        msg: 'Unexpected error during login',
        action: 'AUTH_LOGIN_ERROR',
        service: 'Auth',
        error: err instanceof Error ? err.message : err,
        data: { identifier },
      });

      throw err;
    }
  }

  async validateGoogleUser(profile: any): Promise<User> {
    const email = profile.emails?.[0]?.value;
    const googleId = profile.id;

    if (!email) {
      throw new UnauthorizedException('Email não fornecido pelo Google');
    }

    const user = await this.userService.findByEmailOrPhone(email);

    if (user) {
      return user;
    }

    return this.userService.createFromGoogle({
      fullName: profile.displayName,
      email,
      googleId,
    });
  }

  async loginWithGoogle(user: User, res: Response): Promise<void> {
    const token = this.generateAccessToken(user);

    this.authCookieService.setAuthCookie(res, token);
  }

  async logout(res: Response): Promise<void> {
    this.authCookieService.clearAuthCookie(res);
  }

  private generateAccessToken(user: User): string {
    const payload: {
      sub: number;
      role: typeof user.role;
    } = {
      sub: user.id,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      expiresIn: '7d',
    });
  }
}
