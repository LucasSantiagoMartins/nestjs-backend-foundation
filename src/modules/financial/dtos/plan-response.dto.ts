import { Plan } from '../entities/plan.entity';

export class PlanResponseDto {
  id: number;
  name: string;
  description?: string;
  monthlyPrice: string;
  yearlyPrice: string | null;
  currency: string;
  benefits: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: Plan): PlanResponseDto {
    return Object.assign(new PlanResponseDto(), {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      monthlyPrice: entity.monthlyPrice,
      yearlyPrice: entity.yearlyPrice,
      currency: entity.currency,
      benefits: entity.benefits ?? [],
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
