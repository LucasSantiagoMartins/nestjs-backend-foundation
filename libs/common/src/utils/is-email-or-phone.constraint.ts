import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
  ValidationOptions,
} from 'class-validator';
import { EmailUtils } from './email.utils';
import { PhoneNumberUtils } from './phone-number.utils';

@ValidatorConstraint({ name: 'isEmailOrPhone', async: false })
export class IsEmailOrPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    if (typeof value !== 'string') return false;

    const isEmail = EmailUtils.isEmailFormat(value);
    const isPhone = PhoneNumberUtils.isPhoneNumberFormat(value);

    return isEmail || isPhone;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'E-mail ou telefone informado inválido';
  }
}

export function IsEmailOrPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    Validate(IsEmailOrPhoneConstraint, validationOptions)(object, propertyName);
  };
}
