import { JobListing } from '../entities/job-listing.entity';
import { JobCategoryEnum } from '../enums/job-category.enum';
import { Currency } from '@backend-foundation/common/enums/currency.enum';

export class JobResponseDto {
  id: string;
  title: string;
  description: string;
  employmentType?: string;
  workMode?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: Currency;
  salaryPeriod?: string;
  category?: JobCategoryEnum | null;
  publishedAt?: Date;
  expiresAt: Date | null;

  static fromEntity(entity: JobListing): JobResponseDto {
    const dto = new JobResponseDto();
    dto.id = entity.id;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.employmentType = entity.employmentType as any;
    dto.workMode = entity.workMode as any;
    dto.salaryMin = entity.salaryMin as any;
    dto.salaryMax = entity.salaryMax as any;
    dto.salaryCurrency = entity.salaryCurrency;
    dto.salaryPeriod = entity.salaryPeriod as any;
    dto.category = entity.category ?? null;
    dto.publishedAt = entity.publishedAt;
    dto.expiresAt = entity.expiresAt;
    return dto;
  }
}
