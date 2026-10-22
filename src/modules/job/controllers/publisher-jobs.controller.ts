import { Roles, UserDecorator } from '@backend-foundation/authorization';
import { UserRole } from '@backend-foundation/common';
import { SuccessMessage } from '@backend-foundation/common/decorators/success-message.decorator';
import { PaginatedDto } from '@backend-foundation/common/dtos/pagination.dto';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateJobDto } from '../dtos/create-job.dto';
import { JobResponseDto } from '../dtos/job-response.dto';
import { UpdateJobDto } from '../dtos/update-job.dto';
import { JobListing } from '../entities/job-listing.entity';
import { JobListingStatus } from '../enums/job-listing-status.enum';
import { JobService } from '../services/job.service';

@Controller('job-listings/publishers')
export class PublisherJobsController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  @Roles(UserRole.PUBLISHER)
  async listMine(
    @UserDecorator('sub') userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ): Promise<PaginatedDto<JobResponseDto>> {
    return this.jobService.findAllByPublisher(userId, page);
  }

  @Post()
  @Roles(UserRole.PUBLISHER)
  @SuccessMessage('Vaga criada com sucesso.')
  async create(
    @UserDecorator('sub') userId: number,
    @Body() dto: CreateJobDto,
  ): Promise<JobListing> {
    return this.jobService.create(userId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.PUBLISHER)
  @SuccessMessage('Vaga atualizada com sucesso.')
  async update(
    @UserDecorator('sub') userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ): Promise<JobListing> {
    return this.jobService.update(userId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.PUBLISHER)
  @SuccessMessage('Vaga removida com sucesso.')
  async remove(
    @UserDecorator('sub') userId: number,
    @Param('id') id: string,
  ): Promise<void> {
    await this.jobService.remove(userId, id);
  }

  @Patch(':id/pause')
  @Roles(UserRole.PUBLISHER)
  @SuccessMessage('Vaga pausada com sucesso.')
  async pause(
    @UserDecorator('sub') userId: number,
    @Param('id') id: string,
  ): Promise<JobListing> {
    return this.jobService.updateStatus(userId, id, JobListingStatus.PAUSED);
  }

  @Patch(':id/close')
  @Roles(UserRole.PUBLISHER)
  @SuccessMessage('Vaga encerrada com sucesso.')
  async close(
    @UserDecorator('sub') userId: number,
    @Param('id') id: string,
  ): Promise<JobListing> {
    return this.jobService.updateStatus(userId, id, JobListingStatus.CLOSED);
  }
}
