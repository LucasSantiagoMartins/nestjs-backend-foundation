import { Module } from '@nestjs/common';
import { UploadService } from './services/upload.service';
import { UploadController } from './controllers/upload.controller';
import { UploadValidator } from './validators/upload.validator';
import { Upload } from './entities/upload.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudflareR2Module } from '@infra/cloudflare/r2/r2.module';
import { UploadCleanupService } from './services/upload-cleanup.service';

@Module({
  imports: [TypeOrmModule.forFeature([Upload]), CloudflareR2Module],
  providers: [UploadService, UploadValidator, UploadCleanupService],
  exports: [UploadService],
  controllers: [UploadController],
})
export class UploadModule {}
