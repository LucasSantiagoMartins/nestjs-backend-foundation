import { UserRole } from '@backend-foundation/common';
import { PaginatedDto } from '@backend-foundation/common/dtos/pagination.dto';
import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { UploadService } from '@modules/upload/services/upload.service';
import { User } from '@modules/user/entities/user.entity';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityMessageQueryDto } from '../dtos/community-message-query.dto';
import { CommunityMessageResponseDto } from '../dtos/community-message-response.dto';
import { CreateCommunityMessageDto } from '../dtos/create-community-message.dto';
import { SentCommunityMessageDto } from '../dtos/sent-communit-message.dto';
import { CommunityMember } from '../entities/community-member.entity';
import { CommunityMessage } from '../entities/community-message.entity';
import { Community } from '../entities/community.entity';
import { CommunityMessageType } from '../enums/community-message-type.enum';
import { CommunityGateway } from '../gateways/community.gateway';

@Injectable()
export class CommunityMessageService {
  constructor(
    @InjectRepository(CommunityMessage)
    private readonly messageRepo: Repository<CommunityMessage>,
    @InjectRepository(Community)
    private readonly communityRepo: Repository<Community>,
    @InjectRepository(CommunityMember)
    private readonly memberRepo: Repository<CommunityMember>,
    private readonly uploadService: UploadService,
    private readonly notificationService: NotificationService,
    private readonly gateway: CommunityGateway,
    private readonly logger: AppLogger,
  ) {}

  async sendMessage(
    userId: number,
    communityId: number,
    dto: CreateCommunityMessageDto,
  ): Promise<SentCommunityMessageDto> {
    const community = await this.requireMember(userId, communityId);
    const isText = dto.type === CommunityMessageType.TEXT;

    if (isText && !dto.content?.trim())
      throw new BadRequestException('Escreve a mensagem.');

    if (!isText && !dto.mediaUrl)
      throw new BadRequestException('Indica o endereço do ficheiro.');

    if (!isText) await this.uploadService.markAsUsed([dto.mediaUrl!], userId);

    const saved = await this.messageRepo.save(
      this.messageRepo.create({
        communityId,
        userId,
        type: dto.type,
        content: isText ? dto.content : undefined,
        mediaUrl: isText ? undefined : dto.mediaUrl,
      }),
    );

    const sender = await this.messageRepo.manager
      .getRepository(User)
      .createQueryBuilder('sender')
      .leftJoin('sender.profile', 'profile')
      .select('profile.profilePicture', 'profilePictureUrl')
      .where('sender.id = :userId', { userId })
      .getRawOne<{ profilePictureUrl: string | null }>();

    const profilePictureUrl = sender?.profilePictureUrl ?? null;
    const senderName = 'Alguém';

    this.gateway.emitMessage(communityId, {
      id: saved.id,
      communityId,
      userId,
      senderName,
      profilePictureUrl,
      type: saved.type,
      content: saved.content,
      mediaUrl: saved.mediaUrl,
      createdAt: saved.createdAt,
    });

    await this.notifyMembers(
      userId,
      communityId,
      community.name,
      senderName,
      profilePictureUrl,
      saved,
    );

    return {
      id: saved.id,
      content: saved.content,
      mediaUrl: saved.mediaUrl,
      createdAt: saved.createdAt,
      type: saved.type,
    };
  }

  async listMessages(
    userId: number,
    communityId: number,
    query: CommunityMessageQueryDto,
  ): Promise<PaginatedDto<CommunityMessageResponseDto>> {
    await this.requireMember(userId, communityId);
    const page = query.page || 1,
      limit = query.limit || 20;

    const [items, total] = await this.messageRepo.findAndCount({
      where: { communityId },
      relations: { user: { profile: true } },
      select: {
        id: true,
        communityId: true,
        userId: true,
        type: true,
        content: true,
        mediaUrl: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          profile: { id: true, profilePicture: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items: items.map(CommunityMessageResponseDto.fromEntity),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findMessageById(
    userId: number,
    communityId: number,
    messageId: number,
  ): Promise<CommunityMessageResponseDto> {
    await this.requireMember(userId, communityId);

    const entity = await this.messageRepo.findOne({
      where: { id: messageId, communityId },
      relations: { user: { profile: true } },
      select: {
        id: true,
        communityId: true,
        userId: true,
        type: true,
        content: true,
        mediaUrl: true,
        createdAt: true,
        updatedAt: true,
        user: {
          id: true,
          profile: { id: true, profilePicture: true },
        },
      },
    });

    if (!entity) throw new NotFoundException('Mensagem não encontrada.');
    return CommunityMessageResponseDto.fromEntity(entity);
  }

  async deleteMessage(
    userId: number,
    role: UserRole,
    communityId: number,
    messageId: number,
  ): Promise<void> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId, communityId },
    });

    if (!message) throw new NotFoundException('Mensagem não encontrada.');

    if (message.userId !== userId && role !== UserRole.ADMIN)
      throw new ForbiddenException(
        'Só o autor ou um administrador pode apagar esta mensagem.',
      );

    await this.messageRepo.remove(message);
  }

  private async notifyMembers(
    senderId: number,
    communityId: number,
    communityName: string,
    senderName: string,
    profilePictureUrl: string | null,
    message: CommunityMessage,
  ): Promise<void> {
    try {
      const members = await this.memberRepo.find({ where: { communityId } });

      const text =
        message.type === CommunityMessageType.TEXT
          ? `mandou mensagem ${message.content!.slice(0, 100)}`
          : 'enviou um ficheiro';

      const results = await Promise.allSettled(
        members
          .filter((member) => member.userId !== senderId)
          .map((member) =>
            this.notificationService.notify({
              userId: member.userId,
              title: `Nova mensagem em ${communityName}`,
              message: `${senderName} ${text}`,
              metadata: { senderProfilePictureUrl: profilePictureUrl },
            }),
          ),
      );

      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed)
        this.logger.warn({
          msg: `${failed} notificações falharam na comunidade ${communityId}.`,
          action: 'COMMUNITY_MESSAGE_NOTIFICATION_FAILED',
          service: 'CommunityMessage',
          data: { communityId, failures: failed },
        });
    } catch (err) {
      this.logger.error({
        msg: 'Erro ao notificar membros da comunidade.',
        action: 'COMMUNITY_MESSAGE_NOTIFICATION_ERROR',
        service: 'CommunityMessage',
        data: { communityId },
        error: err,
      });
    }
  }

  private async requireMember(
    userId: number,
    communityId: number,
  ): Promise<Community> {
    const community = await this.communityRepo.findOne({
      where: { id: communityId },
    });
    if (!community) throw new NotFoundException('Comunidade não encontrada.');

    if (!(await this.memberRepo.exists({ where: { communityId, userId } })))
      throw new ForbiddenException(
        'Tens de ser membro para aceder às mensagens.',
      );

    return community;
  }
}
