import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { JobListing } from './job-listing.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'publisher_id', unique: true })
  publisherId: number;

  @ManyToOne(() => User, (user) => user.companies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'publisher_id' })
  publisher: User;

  @Column()
  name: string;

  @Column({ name: 'legal_name', nullable: true })
  legalName?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  municipality?: string;

  @Column({ name: 'address_line', nullable: true })
  addressLine?: string;

  @Column({ name: 'application_email', nullable: true })
  applicationEmail?: string;

  @OneToMany(() => JobListing, (jobListing) => jobListing.company)
  jobListings?: JobListing[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
