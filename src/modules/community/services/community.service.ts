import { PaginatedDto } from '@backend-foundation/common/dtos/pagination.dto';
import { UploadService } from '@modules/upload/services/upload.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunityMemberResponseDto } from '../dtos/community-member-response.dto';
import { CommunityResponseDto } from '../dtos/community-response.dto';
import { CreateCommunityDto } from '../dtos/create-community.dto';
import { UpdateCommunityDto } from '../dtos/update-community.dto';
import { CommunityMember } from '../entities/community-member.entity';
import { Community } from '../entities/community.entity';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(Community)
    private readonly communityRepo: Repository<Community>,
    @InjectRepository(CommunityMember)
    private readonly memberRepo: Repository<CommunityMember>,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    userId: number,
    dto: CreateCommunityDto,
  ): Promise<CommunityResponseDto> {
    if (
      await this.communityRepo.exists({
        where: [{ slug: dto.slug }, { countryCode: dto.countryCode }],
      })
    )
      throw new ConflictException(
        'Já existe uma comunidade para este slug ou país.',
      );
    if (dto.imageUrl)
      await this.uploadService.markAsUsed([dto.imageUrl], userId);
    return CommunityResponseDto.fromEntity(
      await this.communityRepo.save(
        this.communityRepo.create({
          ...dto,
          countryCode: dto.countryCode.toUpperCase(),
        }),
      ),
    );
  }

  async findAll(
    page = 1,
    limit = 20,
    includeInactive = false,
  ): Promise<PaginatedDto<CommunityResponseDto>> {
    const [items, total] = await this.communityRepo.findAndCount({
      where: includeInactive ? {} : { isActive: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
    });
    return {
      items: items.map(CommunityResponseDto.fromEntity),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: number): Promise<CommunityResponseDto> {
    return CommunityResponseDto.fromEntity(await this.findEntityOrFail(id));
  }

  async findBySlug(slug: string): Promise<CommunityResponseDto> {
    const entity = await this.communityRepo.findOne({
      where: { slug, isActive: true },
    });
    if (!entity) throw new NotFoundException('Comunidade não encontrada.');
    return CommunityResponseDto.fromEntity(entity);
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateCommunityDto,
  ): Promise<CommunityResponseDto> {
    const entity = await this.findEntityOrFail(id);
    if (
      dto.slug &&
      dto.slug !== entity.slug &&
      (await this.communityRepo.exists({ where: { slug: dto.slug } }))
    )
      throw new ConflictException('Este slug já está em uso.');
    if (
      dto.countryCode &&
      dto.countryCode.toUpperCase() !== entity.countryCode &&
      (await this.communityRepo.exists({
        where: { countryCode: dto.countryCode.toUpperCase() },
      }))
    )
      throw new ConflictException('Já existe uma comunidade para este país.');
    if (dto.imageUrl && dto.imageUrl !== entity.imageUrl) {
      await this.uploadService.markAsUsed([dto.imageUrl], userId);
    }
    Object.assign(
      entity,
      dto,
      dto.countryCode ? { countryCode: dto.countryCode.toUpperCase() } : {},
    );
    return CommunityResponseDto.fromEntity(
      await this.communityRepo.save(entity),
    );
  }

  async remove(id: number): Promise<void> {
    await this.findEntityOrFail(id);
    await this.communityRepo.delete(id);
  }

  async activate(id: number): Promise<CommunityResponseDto> {
    return this.setActive(id, true);
  }

  async deactivate(id: number): Promise<CommunityResponseDto> {
    return this.setActive(id, false);
  }

  private async setActive(
    id: number,
    isActive: boolean,
  ): Promise<CommunityResponseDto> {
    const entity = await this.findEntityOrFail(id);
    entity.isActive = isActive;
    return CommunityResponseDto.fromEntity(
      await this.communityRepo.save(entity),
    );
  }

  async joinCommunity(
    userId: number,
    communityId: number,
  ): Promise<CommunityMemberResponseDto> {
    const community = await this.findEntityOrFail(communityId);
    if (!community.isActive)
      throw new BadRequestException(
        'Não é possível entrar numa comunidade inativa.',
      );

    if (await this.memberRepo.exists({ where: { communityId, userId } }))
      throw new ConflictException('Já és membro desta comunidade.');

    return CommunityMemberResponseDto.fromEntity(
      await this.memberRepo.save(
        this.memberRepo.create({ communityId, userId }),
      ),
    );
  }

  async leaveCommunity(userId: number, communityId: number): Promise<void> {
    await this.findEntityOrFail(communityId);
    const member = await this.memberRepo.findOne({
      where: { communityId, userId },
    });

    if (!member)
      throw new BadRequestException('Não és membro desta comunidade.');

    await this.memberRepo.remove(member);
  }

  async isMember(
    userId: number,
    communityId: number,
  ): Promise<{ isMember: boolean }> {
    await this.findEntityOrFail(communityId);
    return {
      isMember: await this.memberRepo.exists({
        where: { userId, communityId },
      }),
    };
  }

  async listMembers(
    communityId: number,
    page = 1,
    limit = 20,
  ): Promise<PaginatedDto<CommunityMemberResponseDto>> {
    await this.findEntityOrFail(communityId);

    const [items, total] = await this.memberRepo.findAndCount({
      where: { communityId },
      skip: (page - 1) * limit,
      take: limit,
      order: { joinedAt: 'DESC' },
    });

    return {
      items: items.map(CommunityMemberResponseDto.fromEntity),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async findEntityOrFail(id: number): Promise<Community> {
    const entity = await this.communityRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Comunidade não encontrada.');
    return entity;
  }
}
