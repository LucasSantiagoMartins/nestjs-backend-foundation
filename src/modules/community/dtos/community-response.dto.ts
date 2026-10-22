import { Community } from '../entities/community.entity';

export class CommunityResponseDto {
  id: number;
  name: string;
  slug: string;
  countryCode: string;
  countryName: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  static fromEntity(entity: Community): CommunityResponseDto {
    return Object.assign(new CommunityResponseDto(), {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      countryCode: entity.countryCode,
      countryName: entity.countryName,
      description: entity.description,
      imageUrl: entity.imageUrl,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
