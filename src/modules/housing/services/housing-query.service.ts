import { PaginatedDto } from '@backend-foundation/common/dtos/pagination.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HousingResponseDto } from '../dtos/housing-response.dto';
import { HousingListing } from '../entities/housing-listing.entity';

@Injectable()
export class HousingQueryService {
  constructor(
    @InjectRepository(HousingListing)
    private readonly housingRepo: Repository<HousingListing>,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<PaginatedDto<HousingResponseDto>> {
    const [items, total] = await this.housingRepo.findAndCount({
      relations: { rooms: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const dtoItems = items.map((i) => HousingResponseDto.fromEntity(i));

    return {
      items: dtoItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllByPublisher(
    publisherId: number,
    page = 1,
    limit = 10,
  ): Promise<PaginatedDto<HousingResponseDto>> {
    const [items, total] = await this.housingRepo.findAndCount({
      where: { publisherId },
      relations: { rooms: true },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const dtoItems = items.map((i) => HousingResponseDto.fromEntity(i));

    return {
      items: dtoItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number): Promise<HousingResponseDto> {
    const housing = await this.housingRepo.findOne({
      where: { id },
      relations: { rooms: true },
    });
    if (!housing) throw new NotFoundException('Alojamento não encontrado.');
    return HousingResponseDto.fromEntity(housing);
  }
}
