import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateCommunityDto {
  @IsOptional()
  @IsString({ message: 'O nome da comunidade deve ser um texto.' })
  @IsNotEmpty({ message: 'Indica o nome da comunidade.' })
  @MaxLength(120, { message: 'O nome pode ter no máximo 120 caracteres.' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'O endereço da comunidade deve ser um texto.' })
  @IsNotEmpty({ message: 'Indica o endereço da comunidade.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Usa letras minúsculas, números e hífen no endereço.',
  })
  @MaxLength(100, { message: 'O endereço pode ter no máximo 100 caracteres.' })
  slug?: string;

  @IsOptional()
  @IsString({ message: 'O código do país deve ser um texto.' })
  @IsNotEmpty({ message: 'Indica o código do país.' })
  @Length(2, 2, { message: 'O código do país deve ter 2 letras.' })
  @Matches(/^[A-Z]{2}$/, { message: 'Usa 2 letras maiúsculas no código.' })
  countryCode?: string;

  @IsOptional()
  @IsString({ message: 'O nome do país deve ser um texto.' })
  @IsNotEmpty({ message: 'Indica o nome do país.' })
  @MaxLength(100, {
    message: 'O nome do país pode ter no máximo 100 caracteres.',
  })
  countryName?: string;

  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  @MaxLength(2000, {
    message: 'A descrição pode ter no máximo 2000 caracteres.',
  })
  description?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Indica um endereço válido para a imagem.' })
  @MaxLength(2048, { message: 'O endereço da imagem é demasiado longo.' })
  imageUrl?: string;

  @IsOptional()
  @IsBoolean({ message: 'Escolhe se a comunidade está ativa.' })
  isActive?: boolean;
}
