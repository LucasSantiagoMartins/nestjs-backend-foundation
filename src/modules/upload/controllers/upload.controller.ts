import { Public, UserDecorator } from '@backend-foundation/authorization';
import { Body, Controller, Post } from '@nestjs/common';
import { CreatePresignedUploadDto } from '../dtos/create-presigned-url.dto';
import { UploadService } from '../services/upload.service';

@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presigned')
  async getPresignedUrl(
    @UserDecorator('sub') userId: number,
    @Body() data: CreatePresignedUploadDto,
  ) {
    return this.uploadService.createPresignedUpload(userId, data);
  }

  @Post('presigned-public')
  @Public()
  async getPublicPresignedUrl(@Body() data: CreatePresignedUploadDto) {
    return this.uploadService.createPublicPresignedUpload(data);
  }
}
