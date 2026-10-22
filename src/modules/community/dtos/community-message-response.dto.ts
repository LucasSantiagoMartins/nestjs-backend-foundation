import { CommunityMessage } from '../entities/community-message.entity';
import { CommunityMessageType } from '../enums/community-message-type.enum';

export class CommunityMessageResponseDto {
  id: number;
  communityId: number;
  userId: number;
  profilePictureUrl: string | null;
  type: CommunityMessageType;
  content?: string;
  mediaUrl?: string;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: CommunityMessage): CommunityMessageResponseDto {
    return Object.assign(new CommunityMessageResponseDto(), {
      id: entity.id,
      communityId: entity.communityId,
      userId: entity.userId,
      profilePictureUrl: entity.user?.profile?.profilePicture ?? null,
      type: entity.type,
      content: entity.content,
      mediaUrl: entity.mediaUrl,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
