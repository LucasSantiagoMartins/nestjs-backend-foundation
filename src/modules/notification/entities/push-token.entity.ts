import { User } from '@modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('push_tokens')
export class PushToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @Column({ unique: true })
  token: string;

  @Column({
    nullable: true,
  })
  platform: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;
}
