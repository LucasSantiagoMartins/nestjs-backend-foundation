import { Currency } from '@backend-foundation/common/enums/currency.enum';
import {
  CoordinateRangeConstraint,
  CoordinatesPairConstraint,
} from '@backend-foundation/common/utils/coordinates.constraint';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Validate,
  ValidateNested,
} from 'class-validator';
import { AccommodationType } from '../enums/accommodation-type.enum';
import { HousingPricePeriod } from '../enums/housing-price-period.enum';
import { PropertyType } from '../enums/property-type.enum';
import { CreateHousingRoomDto } from './create-housing-room.dto';

export class CreateHousingDto {
  @IsString({ message: 'O título é obrigatório.' })
  @IsNotEmpty({ message: 'O título é obrigatório.' })
  title: string;

  @IsString({ message: 'A descrição é obrigatória.' })
  @IsNotEmpty({ message: 'A descrição é obrigatória.' })
  description: string;

  @IsDateString({}, { message: 'A data de disponibilidade deve ser válida.' })
  expiresAt: string;

  @IsOptional()
  @IsEnum(PropertyType, { message: 'Tipo de propriedade inválido.' })
  propertyType?: PropertyType;

  @IsOptional()
  @IsEnum(AccommodationType, { message: 'Tipo de alojamento inválido.' })
  accommodationType?: AccommodationType;

  @IsOptional()
  @IsString({ message: 'O município é obrigatório.' })
  municipality?: string;

  @IsOptional()
  @IsString({ message: 'O endereço detalhado deve ser texto.' })
  addressLine?: string;

  @Validate(CoordinatesPairConstraint)
  @Validate(CoordinateRangeConstraint, [-90, 90])
  latitude?: number | null;

  @Validate(CoordinatesPairConstraint)
  @Validate(CoordinateRangeConstraint, [-180, 180])
  longitude?: number | null;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @IsOptional()
  @IsEnum(Currency, { message: 'A moeda do preço é inválida.' })
  priceCurrency?: Currency;

  @IsOptional()
  @IsEnum(HousingPricePeriod, { message: 'Período de preço inválido.' })
  pricePeriod?: HousingPricePeriod;

  @IsOptional()
  @IsNumber()
  bedrooms?: number;

  @IsOptional()
  @IsNumber()
  bathrooms?: number;

  @IsArray({ message: 'As imagens do imóvel devem ser enviadas em uma lista.' })
  @ArrayMinSize(3, { message: 'O imóvel deve ter pelo menos 3 imagens.' })
  @IsString({ each: true, message: 'Cada imagem deve ser uma URL válida.' })
  imageUrls: string[];

  @IsArray({
    message: 'Os quartos do alojamento devem ser enviados em uma lista.',
  })
  @IsNotEmpty({ message: 'O alojamento deve possuir ao menos um quarto.' })
  @ValidateNested({ each: true })
  @Type(() => CreateHousingRoomDto)
  rooms: CreateHousingRoomDto[];
}
