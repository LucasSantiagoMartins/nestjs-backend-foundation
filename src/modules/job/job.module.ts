import { UploadModule } from "@modules/upload/upload.module";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/entities/user.entity";
import { JobsController } from "./controllers/job.controller";
import { PublisherCompaniesController } from "./controllers/publisher-companies.controller";
import { PublisherJobsController } from "./controllers/publisher-jobs.controller";
import { Company } from "./entities/company.entity";
import { JobListing } from "./entities/job-listing.entity";
import { JobRequirement } from "./entities/job-requirement.entity";
import { JobService } from "./services/job.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([JobListing, JobRequirement, User, Company]),
    UploadModule,
  ],
  controllers: [
    JobsController,
    PublisherJobsController,
    PublisherCompaniesController,
  ],
  providers: [JobService],
  exports: [JobService],
})
export class JobModule {}
