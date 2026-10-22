import { BadRequestException } from '@nestjs/common';
import { ValidatorConstraint } from 'class-validator';
import { ValidationArguments } from 'class-validator/types/validation/ValidationArguments';
import { ValidatorConstraintInterface } from 'class-validator/types/validation/ValidatorConstraintInterface';

export class EmailUtils {
  static isEmailFormat(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return emailRegex.test(value);
  }

  static validate(value: string, errMessage?: string) {
    if (!this.isEmailFormat(value)) {
      throw new BadRequestException(errMessage ?? 'E-mail inválido');
    }
    return true;
  }
}

@ValidatorConstraint({ name: 'isEmailFormatCustom', async: false })
export class IsEmailFormatConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value) return true;
    return EmailUtils.isEmailFormat(value);
  }

  defaultMessage(args: ValidationArguments) {
    return 'O formato do e-mail informado é inválido';
  }
}
