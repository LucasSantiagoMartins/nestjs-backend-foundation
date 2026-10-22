import { Public, Roles } from '@backend-foundation/authorization';
import { UserRole } from '@backend-foundation/common';
import { SuccessMessage } from '@backend-foundation/common/decorators/success-message.decorator';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreatePlanDto } from '../dtos/create-plan.dto';
import { PlanResponseDto } from '../dtos/plan-response.dto';
import { PlanService } from '../services/plan.service';

@Controller('financial/plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Public()
  @Get()
  findAll(): Promise<PlanResponseDto[]> {
    return this.planService.findAll(true);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  @SuccessMessage('Plano criado com sucesso.')
  create(@Body() dto: CreatePlanDto): Promise<PlanResponseDto> {
    return this.planService.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Get('all')
  findAllForAdmin(): Promise<PlanResponseDto[]> {
    return this.planService.findAll(false);
  }
}
