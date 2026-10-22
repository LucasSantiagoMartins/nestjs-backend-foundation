import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobRequirementType } from '../enums/job-requirement-type.enum';
import { JobListing } from './job-listing.entity';

@Entity('job_requirements')
export class JobRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'job_listing_id' })
  jobListingId: string;

  @ManyToOne(() => JobListing, (job) => job.requirements, {
    onDelete: 'CASCADE',
  })
  jobListing: JobListing;

  @Column({ type: 'enum', enum: JobRequirementType })
  type: JobRequirementType;

  @Column({ type: 'text' })
  description: string;

  @Column({ default: true })
  required: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
