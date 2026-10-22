import { Currency } from '@backend-foundation/common/enums/currency.enum';
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
import { JobCategoryEnum } from '../enums/job-category.enum';
import { JobRequirement } from './job-requirement.entity';
import { JobListingStatus } from '../enums/job-listing-status.enum';
import { EmploymentType } from '../enums/employment-type.enum';
import { WorkMode } from '../enums/work-mode.enum';
import { SalaryPeriod } from '../enums/salary-period.enum';
import { User } from '../../user/entities/user.entity';
import { Company } from './company.entity';

@Entity('job_listings')
export class JobListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'company_id', nullable: true })
  companyId: number | null;

  @ManyToOne(() => Company, (company) => company.jobListings, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: JobListingStatus,
    default: JobListingStatus.PUBLISHED,
  })
  status: JobListingStatus;

  @Column({ type: 'enum', enum: EmploymentType, nullable: true })
  employmentType?: EmploymentType;

  @Column({ type: 'enum', enum: WorkMode, nullable: true })
  workMode?: WorkMode;

  @Column()
  applicationEmail: string;

  @Column({ name: 'salary_min', type: 'decimal', nullable: true })
  salaryMin?: number;

  @Column({ name: 'salary_max', type: 'decimal', nullable: true })
  salaryMax?: number;

  @Column({
    name: 'salary_currency',
    type: 'enum',
    enum: Currency,
    nullable: true,
  })
  salaryCurrency?: Currency;

  @Column({
    name: 'salary_period',
    type: 'enum',
    enum: SalaryPeriod,
    nullable: true,
  })
  salaryPeriod?: SalaryPeriod;

  @Column({ type: 'enum', enum: JobCategoryEnum, nullable: true })
  category?: JobCategoryEnum;

  @OneToMany(() => JobRequirement, (r) => r.jobListing, { cascade: true })
  requirements?: JobRequirement[];

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
