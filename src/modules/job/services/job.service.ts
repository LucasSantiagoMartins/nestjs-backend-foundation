import { PaginatedDto } from '@backend-foundation/common/dtos/pagination.dto';
import { UploadService } from '@modules/upload/services/upload.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThanOrEqual, Repository } from 'typeorm';
import { CompanyResponseDto } from '../dtos/company-response.dto';
import { CreateCompanyDto } from '../dtos/create-company.dto';
import { CreateJobDto } from '../dtos/create-job.dto';
import { JobListingDetailsResponseDto } from '../dtos/job-listing-details-response.dto';
import { JobResponseDto } from '../dtos/job-response.dto';
import { UpdateJobDto } from '../dtos/update-job.dto';
import { Company } from '../entities/company.entity';
import { JobListing } from '../entities/job-listing.entity';
import { JobRequirement } from '../entities/job-requirement.entity';
import { JobListingStatus } from '../enums/job-listing-status.enum';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(JobListing)
    private readonly jobRepo: Repository<JobListing>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly dataSource: DataSource,
    private readonly uploadService: UploadService,
  ) {}

  async create(userId: number, dto: CreateJobDto): Promise<JobListing> {
    return this.dataSource.transaction(async (manager) => {
      const jobRepo = manager.getRepository(JobListing);
      const reqRepo = manager.getRepository(JobRequirement);
      const company = await manager
        .getRepository(Company)
        .findOne({ where: { publisherId: userId } });
      if (!company)
        throw new BadRequestException(
          'Adicione uma empresa antes de criar uma vaga.',
        );

      const job = jobRepo.create({
        userId,
        companyId: company.id,
        status: JobListingStatus.PUBLISHED,
        publishedAt: new Date(),
        expiresAt: this.validateExpiration(dto.expiresAt),
        title: dto.title,
        description: dto.description,
        employmentType: dto.employmentType,
        workMode: dto.workMode,
        salaryMin: dto.salaryMin,
        salaryMax: dto.salaryMax,
        salaryCurrency: dto.salaryCurrency,
        applicationEmail: dto.applicationEmail,
        salaryPeriod: dto.salaryPeriod,
      });

      const saved = await jobRepo.save(job);

      if (dto.requirements?.length) {
        const reqs = dto.requirements.map((r) =>
          reqRepo.create({
            jobListingId: saved.id,
            type: r.type,
            description: r.description,
            required: r.required ?? true,
          }),
        );
        const savedReqs = await reqRepo.save(reqs);
        saved.requirements = savedReqs;
      }

      if (dto.category) {
        saved.category = dto.category;
      }

      return saved as JobListing;
    });
  }

  async findAll(page = 1, limit = 10): Promise<PaginatedDto<JobResponseDto>> {
    const [items, totalItems] = await this.jobRepo.findAndCount({
      where: { status: JobListingStatus.PUBLISHED },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const dtoItems = items.map((l) => JobResponseDto.fromEntity(l));

    return {
      items: dtoItems,
      pagination: {
        total: totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findAllByPublisher(
    userId: number,
    page = 1,
    limit = 10,
  ): Promise<PaginatedDto<JobResponseDto>> {
    const [items, totalItems] = await this.jobRepo.findAndCount({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items: items.map((job) => JobResponseDto.fromEntity(job)),
      pagination: {
        total: totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async findById(id: string): Promise<JobListingDetailsResponseDto> {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: { requirements: true, company: true },
    });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    return JobListingDetailsResponseDto.fromEntity(job);
  }

  async createCompany(
    userId: number,
    dto: CreateCompanyDto,
  ): Promise<CompanyResponseDto> {
    const existing = await this.companyRepo.findOne({
      where: { publisherId: userId },
    });
    if (existing)
      throw new ConflictException(
        'Sua conta já representa uma empresa. Não é possível cadastrar outra empresa.',
      );
    if (dto.logoUrl) await this.uploadService.markAsUsed([dto.logoUrl], userId);
    const company = this.companyRepo.create({ ...dto, publisherId: userId });
    return CompanyResponseDto.fromEntity(await this.companyRepo.save(company));
  }

  async getJobListingCompany(listingId: string): Promise<CompanyResponseDto> {
    const listing = await this.jobRepo.findOne({
      where: { id: listingId },
      relations: ['company'],
    });

    if (!listing) {
      throw new NotFoundException('Vaga de emprego não encontrada');
    }

    if (!listing.company) {
      throw new NotFoundException('Empresa associada à vaga não encontrada');
    }

    return CompanyResponseDto.fromEntity(listing.company);
  }

  async findCompanyByPublisher(
    userId: number,
    id: number,
  ): Promise<CompanyResponseDto> {
    const company = await this.companyRepo.findOne({
      where: { id, publisherId: userId },
    });
    if (!company) throw new NotFoundException('Empresa não encontrada.');
    return CompanyResponseDto.fromEntity(company);
  }

  private async findJobOrFail(id: string, userId: number) {
    const job = await this.jobRepo.findOne({
      where: { id, userId },
      relations: { requirements: true, user: true },
    });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    return job;
  }

  async update(
    userId: number,
    id: string,
    dto: UpdateJobDto,
  ): Promise<JobListing> {
    const job = await this.findJobOrFail(id, userId);

    const { expiresAt, ...fields } = dto;
    const parsedExpiration =
      expiresAt === undefined ? undefined : this.validateExpiration(expiresAt);
    Object.assign(job, fields);
    if (parsedExpiration !== undefined) job.expiresAt = parsedExpiration;

    const saved = await this.jobRepo.save(job);

    return saved;
  }

  async remove(userId: number, id: string): Promise<void> {
    await this.findJobOrFail(id, userId);
    await this.jobRepo.delete({ id });
  }

  async updateStatus(
    userId: number,
    id: string,
    status: JobListingStatus.PAUSED | JobListingStatus.CLOSED,
  ): Promise<JobListing> {
    const job = await this.findJobOrFail(id, userId);
    if (status === JobListingStatus.PAUSED) {
      if (job.status !== JobListingStatus.PUBLISHED) {
        throw new BadRequestException('A vaga não está publicada.');
      }
    } else if (job.status === JobListingStatus.CLOSED) {
      throw new BadRequestException('A vaga já está encerrada.');
    }

    job.status = status;
    return this.jobRepo.save(job);
  }

  private validateExpiration(value: string): Date {
    const expiresAt = new Date(value);
    if (
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'A data de disponibilidade deve ser futura.',
      );
    }
    return expiresAt;
  }

  @Cron('0 */15 * * * *')
  async expireListings(): Promise<void> {
    await this.jobRepo.update(
      {
        status: In([JobListingStatus.PUBLISHED, JobListingStatus.PAUSED]),
        expiresAt: LessThanOrEqual(new Date()),
      },
      { status: JobListingStatus.EXPIRED },
    );
  }
}
