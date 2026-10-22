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
import { CreateHousingDto } from '../dtos/create-housing.dto';
import { HousingResponseDto } from '../dtos/housing-response.dto';
import { UpdateHousingStatusDto } from '../dtos/update-housing-status.dto';
import { UpdateHousingDto } from '../dtos/update-housing.dto';
import { HousingListing } from '../entities/housing-listing.entity';
import { HousingQueryService } from '../services/housing-query.service';
import { HousingService } from '../services/housing.service';

@Controller('publishers/housing-listings')
export class PublisherHousingController {
  constructor(
    private readonly housingService: HousingService,
    private readonly housingQueryService: HousingQueryService,
  ) {}

  @Post()
  @Roles(UserRole.PUBLISHER)
  @SuccessMessage('Alojamento criado com sucesso.')
  async create(
    @UserDecorator('sub') userId: number,
    @Body() dto: CreateHousingDto,
  ): Promise<HousingListing> {
    return this.housingService.create(userId, dto);
  }

  @Get()
  @Roles(UserRole.PUBLISHER)
  async listMine(
    @UserDecorator('sub') userId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ): Promise<PaginatedDto<HousingResponseDto>> {
    return this.housingQueryService.findAllByPublisher(userId, page);
  }

  @Patch(':id')
  @Roles(UserRole.PUBLISHER)
  @SuccessMessage('Alojamento atualizado com sucesso.')
  async update(
    @UserDecorator('sub') userId: number,
    @Param('id') id: number,
    @Body() dto: UpdateHousingDto,
  ): Promise<HousingListing> {
    return this.housingService.update(userId, Number(id), dto);
  }

  @Delete(':id')
  @Roles(UserRole.PUBLISHER)
  @SuccessMessage('Alojamento removido com sucesso.')
  async remove(
    @UserDecorator('sub') userId: number,
    @Param('id') id: number,
  ): Promise<void> {
    await this.housingService.remove(userId, Number(id));
  }

  @Patch(':id/status')
  @Roles(UserRole.PUBLISHER)
  @SuccessMessage('Estado do alojamento atualizado com sucesso.')
  async changeStatus(
    @UserDecorator('sub') userId: number,
    @Param('id') id: number,
    @Body() dto: UpdateHousingStatusDto,
  ): Promise<HousingListing> {
    return this.housingService.changeStatus(userId, Number(id), dto.status);
  }
}
