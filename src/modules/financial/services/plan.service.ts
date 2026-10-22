import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePlanDto } from '../dtos/create-plan.dto';
import { PlanResponseDto } from '../dtos/plan-response.dto';
import { Plan } from '../entities/plan.entity';

@Injectable()
export class PlanService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  async create(dto: CreatePlanDto): Promise<PlanResponseDto> {
    const plan = this.planRepository.create({
      ...dto,
      monthlyPrice: dto.monthlyPrice.toFixed(2),
      yearlyPrice: dto.yearlyPrice == null ? null : dto.yearlyPrice.toFixed(2),
      benefits: dto.benefits ?? [],
      currency: 'EUR',
      isActive: dto.isActive ?? true,
    });
    return PlanResponseDto.fromEntity(await this.planRepository.save(plan));
  }

  async findAll(activeOnly = true): Promise<PlanResponseDto[]> {
    const plans = await this.planRepository.find({
      where: activeOnly ? { isActive: true } : {},
      order: { createdAt: 'DESC' },
    });
    return plans.map(PlanResponseDto.fromEntity);
  }

  async findOne(id: number): Promise<PlanResponseDto> {
    const plan = await this.planRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plano não encontrado.');
    return PlanResponseDto.fromEntity(plan);
  }
}
