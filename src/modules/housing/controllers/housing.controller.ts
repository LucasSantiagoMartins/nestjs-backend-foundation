import { PaginatedDto } from '@backend-foundation/common/dtos/pagination.dto';
import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { HousingResponseDto } from '../dtos/housing-response.dto';
import { HousingQueryService } from '../services/housing-query.service';

@Controller('housing-listings')
export class HousingController {
  constructor(private readonly housingQueryService: HousingQueryService) {}

  @Get()
  async list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ): Promise<PaginatedDto<HousingResponseDto>> {
    return this.housingQueryService.findAll(page);
  }

  @Get(':id')
  async getById(@Param('id') id: number): Promise<HousingResponseDto> {
    return this.housingQueryService.findById(Number(id));
  }
}
