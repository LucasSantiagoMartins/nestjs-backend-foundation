import { Roles, UserDecorator } from '@backend-foundation/authorization';
import { UserRole } from '@backend-foundation/common';
import { SuccessMessage } from '@backend-foundation/common/decorators/success-message.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { CompanyResponseDto } from '../dtos/company-response.dto';
import { CreateCompanyDto } from '../dtos/create-company.dto';
import { JobService } from '../services/job.service';

@Controller('job-listings/publishers/companies')
@Roles(UserRole.PUBLISHER)
export class PublisherCompaniesController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @SuccessMessage('Empresa criada com sucesso.')
  create(
    @UserDecorator('sub') userId: number,
    @Body() dto: CreateCompanyDto,
  ): Promise<CompanyResponseDto> {
    return this.jobService.createCompany(userId, dto);
  }

  @Get(':id')
  getMine(
    @UserDecorator('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CompanyResponseDto> {
    return this.jobService.findCompanyByPublisher(userId, id);
  }
}
