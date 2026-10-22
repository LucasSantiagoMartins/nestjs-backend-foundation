import { CommunityMessageType } from '../enums/community-message-type.enum';

export class SentCommunityMessageDto {
  id: number;
  content?: string;
  mediaUrl?: string;
  type: CommunityMessageType;
  createdAt: Date;
}
