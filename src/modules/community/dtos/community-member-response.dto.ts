import { CommunityMember } from '../entities/community-member.entity';

export class CommunityMemberResponseDto {
  id: number;
  communityId: number;
  userId: number;
  joinedAt: Date;
  static fromEntity(entity: CommunityMember): CommunityMemberResponseDto {
    return Object.assign(new CommunityMemberResponseDto(), {
      id: entity.id,
      communityId: entity.communityId,
      userId: entity.userId,
      joinedAt: entity.joinedAt,
    });
  }
}
