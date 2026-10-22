import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { MatchesProperty } from './matches-property.validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter pelo menos 8 caracteres' })
  newPassword: string;

  @IsString()
  @MatchesProperty('newPassword', {
    message: 'A confirmação deve ser igual à nova senha',
  })
  confirmPassword: string;
}
