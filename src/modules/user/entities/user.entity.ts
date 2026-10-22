import { UserRole } from '@backend-foundation/common';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { CommunityMember } from '../../community/entities/community-member.entity';
import { CommunityMessage } from '../../community/entities/community-message.entity';
import { Subscription } from '../../financial/entities/subscription.entity';
import { Company } from '../../job/entities/company.entity';
import { Profile } from './profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile?: Profile;

  @Column({ name: 'email', type: 'varchar', unique: true, nullable: true })
  email: string | null;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  phoneNumber: string | null;

  @Column({ name: 'password', type: 'varchar', select: false, nullable: true })
  password: string | null;

  @Column({
    name: 'role',
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    name: 'provider',
  })
  provider: 'LOCAL' | 'GOOGLE';

  @Column({
    name: 'google_id',
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  googleId: string | null;

  @OneToMany(() => CommunityMember, (membership) => membership.user)
  communityMemberships?: CommunityMember[];

  @OneToMany(() => CommunityMessage, (message) => message.user)
  communityMessages?: CommunityMessage[];

  @OneToMany(() => Company, (company) => company.publisher)
  companies?: Company[];

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions?: Subscription[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
