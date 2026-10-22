import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @IsString({ message: 'O nome deve ser um texto válido.' })
  @MaxLength(255, { message: 'O nome deve ter no máximo 255 caracteres.' })
  fullName: string;
}
