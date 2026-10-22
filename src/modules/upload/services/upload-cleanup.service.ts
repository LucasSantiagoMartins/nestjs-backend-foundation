import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UploadService } from './upload.service';

@Injectable()
export class UploadCleanupService {
  constructor(
    private readonly uploadService: UploadService,
    private readonly logger: AppLogger,
  ) {}

  @Cron('0 0 * * *', { timeZone: 'Europe/Lisbon' })
  async handleCleanup() {
    const expiredUploads =
      await this.uploadService.findExpiredTemporaryUploads();

    for (const upload of expiredUploads) {
      try {
        await this.uploadService.deleteFileFromUrl(upload.url);
        this.logger.info({
          msg: `Deleted expired upload: ${upload.key}`,
          action: 'UPLOAD_CLEANUP_DELETED',
          service: 'UploadCleanupService',
          data: { uploadId: upload.id, key: upload.key },
        });
      } catch (error) {
        this.logger.error({
          msg: `Failed deleting upload ${upload.key}`,
          action: 'UPLOAD_CLEANUP_ERROR',
          service: 'UploadCleanupService',
          error: error instanceof Error ? error.message : String(error),
          data: { uploadId: upload.id, key: upload.key },
        });
      }
    }

    const removedCount = await this.uploadService.removeOldDeletedUploads();
    this.logger.info({
      msg: 'Upload cleanup completed',
      action: 'UPLOAD_CLEANUP_COMPLETED',
      service: 'UploadCleanupService',
      data: {
        expiredFilesProcessed: expiredUploads.length,
        deletedRecordsRemoved: removedCount,
      },
    });
  }
}
