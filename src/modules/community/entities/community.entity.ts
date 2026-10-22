import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CommunityMember } from './community-member.entity';
import { CommunityMessage } from './community-message.entity';

@Entity('communities')
@Index('IDX_communities_country_code', ['countryCode'])
@Index('IDX_communities_is_active', ['isActive'])
export class Community {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Index('UQ_communities_slug', { unique: true })
  @Column({ unique: true })
  slug: string;
  @Column({ name: 'country_code', length: 2, unique: true })
  countryCode: string;
  @Column({ name: 'country_name' }) countryName: string;
  @Column({ type: 'text', nullable: true }) description?: string;
  @Column({ name: 'image_url', nullable: true }) imageUrl?: string;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @OneToMany(() => CommunityMember, (member) => member.community)
  members: CommunityMember[];
  @OneToMany(() => CommunityMessage, (message) => message.community)
  messages: CommunityMessage[];
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
