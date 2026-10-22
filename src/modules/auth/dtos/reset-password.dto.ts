import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { MatchesProperty } from './matches-property.validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório' })
  @IsString()
  email: string;

  @IsString()
  @Matches(/^\d{5}$/, { message: 'Código de recuperação inválido' })
  code: string;

  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter pelo menos 8 caracteres' })
  newPassword: string;

  @IsString()
  @MatchesProperty('newPassword', {
    message: 'A confirmação deve ser igual à nova senha',
  })
  confirmPassword: string;
}
