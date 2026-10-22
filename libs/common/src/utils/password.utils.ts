import { BadRequestException } from '@nestjs/common';

export function validatePassword(password: string) {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  if (!password || password.length < 8 || !passwordRegex.test(password)) {
    throw new BadRequestException(
      'A senha informada não é segura o suficiente',
    );
  }

  return true;
}
