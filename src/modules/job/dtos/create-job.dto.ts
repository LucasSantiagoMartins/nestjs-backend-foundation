import { Currency } from '@backend-foundation/common/enums/currency.enum';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmploymentType } from '../enums/employment-type.enum';
import { WorkMode } from '../enums/work-mode.enum';
import { SalaryPeriod } from '../enums/salary-period.enum';
import { CreateJobRequirementDto } from './create-job-requirement.dto';
import { JobCategoryEnum } from '../enums/job-category.enum';

export class CreateJobDto {
  @IsString({ message: 'O título da vaga é obrigatório.' })
  @IsNotEmpty({ message: 'O título da vaga é obrigatório.' })
  title: string;

  @IsString({ message: 'A descrição da vaga é obrigatória.' })
  @IsNotEmpty({ message: 'A descrição da vaga é obrigatória.' })
  description: string;

  @IsEnum(EmploymentType, { message: 'O tipo de contratação é inválido.' })
  @IsOptional()
  employmentType?: EmploymentType;

  @IsEnum(WorkMode, { message: 'O modelo de trabalho é inválido.' })
  @IsOptional()
  workMode?: WorkMode;

  @IsString({ message: 'O e-mail de candidatura é obrigatório.' })
  @IsNotEmpty({ message: 'O e-mail de candidatura é obrigatório.' })
  @IsEmail({}, { message: 'Informe um endereço de e-mail válido.' })
  applicationEmail: string;

  @IsDateString({}, { message: 'A data de disponibilidade deve ser válida.' })
  expiresAt: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  salaryMin?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  salaryMax?: number;

  @IsOptional()
  @IsEnum(Currency, { message: 'A moeda do salário é inválida.' })
  salaryCurrency?: Currency;

  @IsOptional()
  @IsEnum(SalaryPeriod, { message: 'O período de salário é inválido.' })
  salaryPeriod?: SalaryPeriod;

  @IsOptional()
  @IsEnum(JobCategoryEnum, { message: 'Categoria inválida.' })
  category?: JobCategoryEnum;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJobRequirementDto)
  requirements?: CreateJobRequirementDto[];

  @IsOptional()
  @IsArray({ message: 'As responsabilidades devem ser uma lista.' })
  @IsString({
    each: true,
    message: 'Cada responsabilidade deve ser um texto válido.',
  })
  responsibilities?: string[];

  @IsOptional()
  @IsArray({ message: 'Os benefícios devem ser uma lista.' })
  @IsString({ each: true, message: 'Cada benefício deve ser um texto válido.' })
  benefits?: string[];
}
