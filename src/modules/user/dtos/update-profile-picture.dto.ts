import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateProfilePictureDto {
  @IsNotEmpty({ message: 'A URL do ficheiro é obrigatória.' })
  @IsString({ message: 'A URL do ficheiro deve ser um texto válido.' })
  profilePictureUrl: string;
}
