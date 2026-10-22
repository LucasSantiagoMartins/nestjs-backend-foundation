import {
  IsDefined,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePresignedUploadDto {
  @IsDefined({ message: 'A pasta é obrigatória.' })
  @IsNotEmpty({ message: 'A pasta é obrigatória.' })
  @IsString({ message: 'A pasta deve ser um texto válido.' })
  folder: string;

  @IsDefined({ message: 'O tipo de arquivo é obrigatório.' })
  @IsNotEmpty({ message: 'O tipo de arquivo é obrigatório.' })
  @IsString({ message: 'O tipo de arquivo deve ser um texto válido.' })
  fileType: string;

  @IsDefined({ message: 'O hash do arquivo é obrigatório.' })
  @IsNotEmpty({ message: 'O hash do arquivo é obrigatório.' })
  @IsString({ message: 'O hash do arquivo deve ser um texto válido.' })
  fileHash: string;

  @IsDefined({ message: 'O tamanho é obrigatório.' })
  @IsNumber({}, { message: 'O tamanho deve ser um número válido.' })
  @IsPositive({ message: 'O tamanho deve ser um número válido.' })
  size: number;
}
