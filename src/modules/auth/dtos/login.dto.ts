import { IsEmailOrPhone } from '@backend-foundation/common/utils/is-email-or-phone.constraint';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'E-mail ou telefone é obrigatório' })
  @IsString({ message: 'E-mail ou telefone informado inválido' })
  @IsEmailOrPhone()
  identifier: string;

  @IsNotEmpty({ message: 'A senha é obrigatória' })
  @IsString({ message: 'Senha informada inválida' })
  password: string;
}
