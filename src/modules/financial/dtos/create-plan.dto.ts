import {
  IsBoolean,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlanDto {
  @IsString({ message: 'O nome do plano deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do plano é obrigatório.' })
  @Matches(/\S/, { message: 'O nome do plano não pode estar vazio.' })
  @MaxLength(150, { message: 'O nome pode ter no máximo 150 caracteres.' })
  name: string;

  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço inválido.' })
  @Min(0, { message: 'Preço inválido.' })
  monthlyPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Preço anual inválido.' })
  @Min(0, { message: 'Preço anual inválido.' })
  yearlyPrice?: number;

  @IsOptional()
  @IsArray({ message: 'Os benefícios devem ser uma lista.' })
  @IsString({ each: true, message: 'Cada benefício deve ser um texto.' })
  benefits?: string[];

  @IsOptional()
  @IsBoolean({ message: 'O estado ativo deve ser verdadeiro ou falso.' })
  isActive?: boolean;
}
