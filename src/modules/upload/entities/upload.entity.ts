import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { UploadStatus } from '../enums/upload-status.enum';

@Entity('uploads')
@Index(['userId', 'fileHash'])
export class Upload {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column()
  fileHash: string;

  @Column()
  key: string;

  @Column()
  url: string;

  @Column()
  mimeType: string;

  @Column()
  folder: string;

  @Column('bigint')
  size: number;

  @Column({
    type: 'enum',
    enum: UploadStatus,
    default: UploadStatus.TEMPORARY,
  })
  status: UploadStatus;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
  })
  updatedAt: Date;
}
