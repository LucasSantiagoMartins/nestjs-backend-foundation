import { IntelligenceModule } from '@infra/intelligence/intelligence.module';
import { HousingModule } from '@modules/housing/housing.module';
import { JobModule } from '@modules/job/job.module';
import { Module } from '@nestjs/common';
import { AssistantController } from './controllers/assistant.controller';
import { AssistantService } from './services/assistant.service';

@Module({
  imports: [IntelligenceModule, JobModule, HousingModule],
  controllers: [AssistantController],
  providers: [AssistantService],
  exports: [AssistantService],
})
export class AssistantModule {}
