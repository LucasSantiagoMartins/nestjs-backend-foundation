import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { R2_CLIENT } from '@infra/cloudflare/r2/providers/r2-client.provider';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, LessThan, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { CreatePresignedUploadDto } from '../dtos/create-presigned-url.dto';
import { Upload } from '../entities/upload.entity';
import { UploadStatus } from '../enums/upload-status.enum';
import { UploadValidator } from '../validators/upload.validator';

@Injectable()
export class UploadService {
  constructor(
    @InjectRepository(Upload)
    private readonly uploadRepo: Repository<Upload>,
    @Inject(R2_CLIENT) private readonly s3: S3Client,
    private readonly uploadValidator: UploadValidator,
    private readonly logger: AppLogger,
  ) {}

  private async generatePresignedUpload(
    userId: number | null,
    dto: CreatePresignedUploadDto,
  ) {
    const { folder, fileType, fileHash, size } = dto;

    const validatedSize = this.uploadValidator.validateUploadData(
      folder,
      fileType,
      size,
      userId === null,
    );

    const key = `${folder}/${uuid()}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: 60 * 10,
    });

    const fileUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const upload = this.uploadRepo.create({
      userId,
      fileHash,
      key,
      url: fileUrl,
      mimeType: fileType,
      folder,
      size: validatedSize,
      status: UploadStatus.TEMPORARY,
      expiresAt,
    });

    await this.uploadRepo.save(upload);

    this.logger.info({
      msg: 'Presigned upload created',
      action: 'UPLOAD_CREATED',
      service: 'Upload',
      data: {
        userId,
        folder,
        key,
        isPublic: userId === null,
      },
    });

    return {
      url: uploadUrl,
      key,
      fileUrl,
    };
  }

  async createPresignedUpload(userId: number, dto: CreatePresignedUploadDto) {
    return this.generatePresignedUpload(userId, dto);
  }

  async createPublicPresignedUpload(dto: CreatePresignedUploadDto) {
    return this.generatePresignedUpload(null, dto);
  }

  async deleteFileFromUrl(url: string) {
    const key = this.extractKeyFromUrl(url);

    if (!key) return;

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
      }),
    );

    await this.uploadRepo.update(
      { key },
      {
        status: UploadStatus.DELETED,
        deletedAt: new Date(),
      },
    );

    this.logger.info({
      msg: 'File deleted from R2',
      action: 'UPLOAD_DELETED',
      service: 'Upload',
      data: { key },
    });
  }

  async findExpiredTemporaryUploads() {
    const expirationGracePeriod = new Date(Date.now() - 30 * 60 * 1000);

    return this.uploadRepo.find({
      where: {
        status: UploadStatus.TEMPORARY,
        expiresAt: LessThan(expirationGracePeriod),
      },
    });
  }

  async removeOldDeletedUploads(): Promise<number> {
    const deletionGracePeriod = new Date(Date.now() - 30 * 60 * 1000);
    const result = await this.uploadRepo.delete({
      status: UploadStatus.DELETED,
      deletedAt: LessThan(deletionGracePeriod),
    });

    return result.affected ?? 0;
  }

  private extractKeyFromUrl(url: string): string {
    const baseUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');

    if (!baseUrl) return '';

    return url.replace(baseUrl + '/', '');
  }

  async validateTemporaryUpload(key: string, userId: number) {
    const upload = await this.uploadRepo.findOne({
      where: {
        key,
        userId,
      },
    });

    if (!upload) {
      throw new BadRequestException('Upload not found');
    }

    if (upload.status !== UploadStatus.TEMPORARY) {
      throw new BadRequestException('Upload already used');
    }

    if (upload.expiresAt < new Date()) {
      throw new BadRequestException('Upload expired');
    }

    return upload;
  }

  async assignUploadsToUser(
    fileUrls: string[],
    userId: number,
    manager?: EntityManager,
  ): Promise<void> {
    const keys = fileUrls.map((url) => this.extractKeyFromUrl(url));
    const uploadRepo = manager
      ? manager.getRepository(Upload)
      : this.uploadRepo;

    await uploadRepo.update(
      {
        key: In(keys),
        status: UploadStatus.TEMPORARY,
      },
      {
        userId,
      },
    );
  }

  async markAsUsed(
    fileUrls: string[],
    userId: number,
    manager?: EntityManager,
  ) {
    const keys = fileUrls.map((url) => this.extractKeyFromUrl(url));
    const uploadRepo = manager
      ? manager.getRepository(Upload)
      : this.uploadRepo;

    const uploads = await uploadRepo.find({
      where: {
        key: In(keys),
      },
    });

    if (uploads.length !== keys.length) {
      throw new BadRequestException(
        'Alguns arquivos não foram encontrados ou já foram processados',
      );
    }

    for (const upload of uploads) {
      if (upload.userId !== userId && upload.userId !== null) {
        throw new BadRequestException(
          'Você não tem permissão para usar este arquivo',
        );
      }

      if (upload.expiresAt < new Date()) {
        throw new BadRequestException('O upload do arquivo expirou');
      }

      upload.status = UploadStatus.USED;
      upload.usedAt = new Date();
      upload.userId = userId;
    }

    await uploadRepo.save(uploads);

    this.logger.info({
      msg: 'Uploads marked as USED',
      action: 'UPLOAD_USED',
      service: 'Upload',
      data: { userId, keys },
    });

    return uploads;
  }

  async markAsDeleted(fileUrls: string[]) {
    const keys = fileUrls.map((url) => this.extractKeyFromUrl(url));

    await this.uploadRepo.update(
      {
        key: In(keys),
      },
      {
        status: UploadStatus.DELETED,
        deletedAt: new Date(),
      },
    );

    this.logger.info({
      msg: 'Uploads marked as DELETED',
      action: 'UPLOAD_DELETED',
      service: 'Upload',
      data: {
        keys,
      },
    });
  }
}
