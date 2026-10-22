import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Community } from './community.entity';
import { User } from '../../user/entities/user.entity';

@Entity('community_members')
@Index('UQ_community_members_community_user', ['communityId', 'userId'], {
  unique: true,
})
@Index('IDX_community_members_user', ['userId'])
export class CommunityMember {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'community_id' }) communityId: number;
  @Column({ name: 'user_id' }) userId: number;
  @ManyToOne(() => Community, (community) => community.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'community_id' })
  community: Community;
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
  @CreateDateColumn({ name: 'joined_at' }) joinedAt: Date;
}
