import { HashPasswordUtils } from '@backend-foundation/common';
import { EmailTemplateType } from '@backend-foundation/common/enums/email-template-type.enum';
import { QUEUES } from '@infra/queue/queue.constants';
import { HousingService } from '@modules/housing/services/housing.service';
import { UploadService } from '@modules/upload/services/upload.service';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource, Repository } from 'typeorm';
import { RegisterUserDto } from '../dtos/register-user.dto';
import { UpdateProfileDto } from '../dtos/update-profile.dto';
import { UserMeResponseDto } from '../dtos/user-me-response.dto';
import { User } from '../entities/user.entity';
import { ProfileService } from './profile.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly profileService: ProfileService,
    private readonly uploadService: UploadService,
    private readonly housingService: HousingService,
    @InjectQueue(QUEUES.MAIL) private readonly mailQueue: Queue,
  ) {}

  async register(data: RegisterUserDto): Promise<User> {
    if (data.email) {
      const emailExists = await this.userRepository.findOne({
        where: { email: data.email },
      });

      if (emailExists) {
        throw new BadRequestException('O e-mail já está registado');
      }
    }

    if (data.phoneNumber) {
      const phoneExists = await this.userRepository.findOne({
        where: { phoneNumber: data.phoneNumber },
      });

      if (phoneExists) {
        throw new BadRequestException('O número de telefone já está registado');
      }
    }

    const hashedPassword = await HashPasswordUtils.hash(data.password);

    const savedUser = await this.dataSource.transaction(async (manager) => {
      const user = manager.getRepository(User).create({
        email: data.email ?? null,
        phoneNumber: data.phoneNumber ?? null,
        password: hashedPassword,
        role: data.role,
        provider: 'LOCAL',
      });

      const savedUser = await manager.getRepository(User).save(user);
      await this.profileService.createProfile(
        manager,
        data.fullName,
        savedUser.id,
      );
      return savedUser;
    });
    await this.sendWelcomeEmail(savedUser.email, data.fullName);
    return savedUser;
  }

  async createFromGoogle(data: {
    fullName: string;
    email: string;
    googleId: string;
  }): Promise<User> {
    const emailExists = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (emailExists) {
      throw new BadRequestException('O e-mail já está registado');
    }

    const savedUser = await this.dataSource.transaction(async (manager) => {
      const user = manager.getRepository(User).create({
        email: data.email,
        phoneNumber: null,
        password: null,
        provider: 'GOOGLE',
        googleId: data.googleId,
      });

      const savedUser = await manager.getRepository(User).save(user);
      await this.profileService.createProfile(
        manager,
        data.fullName,
        savedUser.id,
      );
      return savedUser;
    });
    await this.sendWelcomeEmail(savedUser.email, data.fullName);
    return savedUser;
  }

  private async sendWelcomeEmail(
    email: string | null,
    fullName: string,
  ): Promise<void> {
    if (!email) return;
    await this.mailQueue.add('send_email', {
      to: email,
      template: EmailTemplateType.USER_WELCOME,
      context: { userName: fullName },
    });
  }

  async findByEmailForPasswordRecovery(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  async findByIdWithPassword(id: number): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.id = :id', { id })
      .getOne();
  }

  async updatePassword(userId: number, password: string): Promise<void> {
    const passwordHash = await HashPasswordUtils.hash(password);
    await this.userRepository.update(userId, { password: passwordHash });
  }

  async updateProfile(userId: number, data: UpdateProfileDto) {
    return this.profileService.update(userId, data);
  }

  async updateProfilePicture(userId: number, fileUrl: string) {
    await this.uploadService.markAsUsed([fileUrl], userId);
    return this.profileService.updatePicture(userId, fileUrl);
  }

  async getMe(userId: number): Promise<UserMeResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: { profile: true },
    });

    if (!user)
      throw new NotFoundException(
        'Não foi possível encontrar as suas informações',
      );
    return UserMeResponseDto.fromEntity(user);
  }

  async deleteAccount(userId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({ where: { id: userId } });

      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      if (
        await this.housingService.hasPendingBookingRequestsForUser(
          userId,
          manager,
        )
      ) {
        throw new BadRequestException(
          'Não é possível apagar a conta enquanto existirem pedidos de reserva pendentes.',
        );
      }

      await this.housingService.removeUserData(userId, manager);
      await userRepo.delete({ id: userId });
    });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        googleId,
      },
    });
  }

  async findByEmailOrPhone(identifier: string): Promise<User | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :identifier', { identifier })
      .orWhere('user.phoneNumber = :identifier', { identifier })
      .getOne();

    return user;
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }
}
