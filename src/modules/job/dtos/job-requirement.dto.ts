import { JobRequirement } from '../entities/job-requirement.entity';
import { JobRequirementType } from '../enums/job-requirement-type.enum';

export class JobRequirementDto {
  id: string;
  type: JobRequirementType;
  description: string;
  required: boolean;

  static fromEntity(entity: JobRequirement): JobRequirementDto {
    const dto = new JobRequirementDto();
    dto.id = entity.id;
    dto.type = entity.type;
    dto.description = entity.description;
    dto.required = !!entity.required;
    return dto;
  }
}
