import { JobListing } from '../entities/job-listing.entity';
import { JobRequirementDto } from './job-requirement.dto';
import { CompanyResponseDto } from './company-response.dto';
import { JobListingStatus } from '../enums/job-listing-status.enum';
import { JobCategoryEnum } from '../enums/job-category.enum';
import { Currency } from '@backend-foundation/common/enums/currency.enum';

export class JobListingDetailsResponseDto {
  id: number;
  title: string;
  description: string;
  status: JobListingStatus;
  employmentType?: string;
  workMode?: string;
  applicationEmail: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: Currency;
  salaryPeriod?: string;
  category?: JobCategoryEnum | null;
  publishedAt?: Date;
  expiresAt: Date | null;
  requirements: JobRequirementDto[];
  company: CompanyResponseDto | null;

  static fromEntity(job: JobListing): JobListingDetailsResponseDto {
    return Object.assign(new JobListingDetailsResponseDto(), {
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status,
      employmentType: job.employmentType,
      workMode: job.workMode,
      applicationEmail: job.applicationEmail,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      salaryPeriod: job.salaryPeriod,
      category: job.category ?? null,
      publishedAt: job.publishedAt,
      expiresAt: job.expiresAt,
      requirements: (job.requirements ?? []).map((r) =>
        JobRequirementDto.fromEntity(r),
      ),
      company: job.company ? CompanyResponseDto.fromEntity(job.company) : null,
    });
  }
}
