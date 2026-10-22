import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateHousingRoomDto {
  @IsOptional()
  @IsBoolean({ message: 'O campo reserved deve ser booleano.' })
  reserved?: boolean;

  @IsOptional()
  @IsString({ message: 'A descrição do quarto deve ser texto.' })
  description?: string;

  @IsArray({ message: 'As imagens do quarto devem ser enviadas em uma lista.' })
  @ArrayMinSize(1, { message: 'Cada quarto deve ter pelo menos 1 imagem.' })
  @ArrayMaxSize(4, { message: 'Cada quarto pode ter no máximo 4 imagens.' })
  @IsString({ each: true, message: 'Cada imagem deve ser uma URL válida.' })
  @IsNotEmpty({ each: true, message: 'Cada imagem deve ser uma URL válida.' })
  imageUrls: string[];
}
