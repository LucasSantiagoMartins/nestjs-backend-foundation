import { UserRole } from '@backend-foundation/common/enums/user-role.enum';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  Validate,
  ValidateIf,
} from 'class-validator';
import { IsEmailFormatConstraint } from '../../../../libs/common/src/utils/email.utils';
import { IsPhoneNumberFormatConstraint } from '../../../../libs/common/src/utils/phone-number.utils';

export class RegisterUserDto {
  @ValidateIf((o) => !o.phoneNumber)
  @IsNotEmpty({
    message: 'O e-mail é obrigatório quando o telefone não for informado',
  })
  @Validate(IsEmailFormatConstraint)
  email?: string;

  @ValidateIf((o) => !o.email)
  @IsNotEmpty({
    message:
      'O número de telefone é obrigatório quando o e-mail não for informado',
  })
  @Validate(IsPhoneNumberFormatConstraint)
  phoneNumber?: string;

  @IsNotEmpty({ message: 'O nome é obrigatório' })
  @IsString({ message: 'O nome deve ser um texto válido' })
  fullName: string;

  @IsNotEmpty({ message: 'O tipo de conta é obrigatório' })
  @IsIn([UserRole.USER, UserRole.PUBLISHER], {
    message: 'Tipo de conta inválido',
  })
  role: UserRole;

  @IsString({ message: 'A senha deve ser um texto válido' })
  password: string;
}
