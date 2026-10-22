import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JobRequirementType } from '../enums/job-requirement-type.enum';

export class CreateJobRequirementDto {
  @IsEnum(JobRequirementType, { message: 'Tipo de requisito inválido.' })
  type: JobRequirementType;

  @IsString({ message: 'A descrição do requisito é obrigatória.' })
  @IsNotEmpty({ message: 'A descrição do requisito é obrigatória.' })
  description: string;

  @IsOptional()
  required?: boolean;
}
