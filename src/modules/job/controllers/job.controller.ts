import { Public } from '@backend-foundation/authorization';
import { PaginatedDto } from '@backend-foundation/common/dtos/pagination.dto';
import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CompanyResponseDto } from '../dtos/company-response.dto';
import { JobListingDetailsResponseDto } from '../dtos/job-listing-details-response.dto';
import { JobResponseDto } from '../dtos/job-response.dto';
import { JobService } from '../services/job.service';

@Controller('job-listings')
export class JobsController {
  constructor(private readonly jobService: JobService) {}

  @Public()
  @Get()
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ): Promise<PaginatedDto<JobResponseDto>> {
    return this.jobService.findAll(page);
  }

  @Public()
  @Get(':id/company')
  getJobListingCompany(@Param('id') id: string): Promise<CompanyResponseDto> {
    return this.jobService.getJobListingCompany(id);
  }

  @Public()
  @Get(':id')
  async getById(
    @Param('id') id: string,
  ): Promise<JobListingDetailsResponseDto> {
    return this.jobService.findById(id);
  }
}
