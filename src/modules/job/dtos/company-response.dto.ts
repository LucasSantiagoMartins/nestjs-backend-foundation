import { Company } from '../entities/company.entity';

export class CompanyResponseDto {
  id: number;
  name: string;
  legalName?: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  email?: string;
  phone?: string;
  municipality?: string;
  addressLine?: string;

  static fromEntity(company: Company): CompanyResponseDto {
    const {
      id,
      name,
      legalName,
      description,
      logoUrl,
      website,
      email,
      phone,
      municipality,
      addressLine,
    } = company;
    return Object.assign(new CompanyResponseDto(), {
      id,
      name,
      legalName,
      description,
      logoUrl,
      website,
      email,
      phone,
      municipality,
      addressLine,
    });
  }
}
