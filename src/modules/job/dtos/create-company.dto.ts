import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompanyDto {
  @IsString({ message: 'O nome da empresa deve ser um texto válido.' })
  @IsNotEmpty({ message: 'O nome da empresa é obrigatório.' })
  name: string;

  @IsOptional() @IsString() legalName?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() website?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;

  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() municipality?: string;
  @IsOptional() @IsString() addressLine?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  applicationEmail?: string;
}
