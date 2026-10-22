import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Community } from './community.entity';
import { CommunityMessageType } from '../enums/community-message-type.enum';

@Entity('community_messages')
@Index('IDX_community_messages_community_created', ['communityId', 'createdAt'])
@Index('IDX_community_messages_user', ['userId'])
export class CommunityMessage {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'community_id' }) communityId: number;
  @Column({ name: 'user_id' }) userId: number;
  @Column({ type: 'enum', enum: CommunityMessageType })
  type: CommunityMessageType;
  @Column({ type: 'text', nullable: true }) content?: string;
  @Column({ name: 'media_url', nullable: true }) mediaUrl?: string;
  @ManyToOne(() => Community, (community) => community.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'community_id' })
  community: Community;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
