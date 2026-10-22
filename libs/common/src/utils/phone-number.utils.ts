import { BadRequestException } from '@nestjs/common';
import { ValidatorConstraint } from 'class-validator';
import { ValidationArguments } from 'class-validator/types/validation/ValidationArguments';
import { ValidatorConstraintInterface } from 'class-validator/types/validation/ValidatorConstraintInterface';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export class PhoneNumberUtils {
  static isPhoneNumberFormat(value: string): boolean {
    const phoneNumber = parsePhoneNumberFromString(value);

    return phoneNumber?.isValid() ?? false;
  }

  static validate(phone: string): boolean {
    if (!this.isPhoneNumberFormat(phone)) {
      throw new BadRequestException('Número de telefone inválido');
    }

    return true;
  }
}

@ValidatorConstraint({ name: 'isPhoneNumberFormatCustom', async: false })
export class IsPhoneNumberFormatConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value) return true;
    return PhoneNumberUtils.isPhoneNumberFormat(value);
  }

  defaultMessage(args: ValidationArguments) {
    return 'Número de telefone inválido';
  }
}
