import { BadRequestException } from '@nestjs/common';

export class UploadValidator {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'application/pdf',
  ];

  private readonly allowedFolders = [
    'profiles/pictures',
    'services/images',
    'housing/listings',
    'community/messages',
    'documents/templates',
  ];

  private readonly publicFolders = ['profiles/pictures', 'housing/listings'];

  validateUploadData(
    folder: string,
    fileType: string,
    size: number,
    isPublic = false,
  ): number {
    if (!folder || typeof folder !== 'string')
      throw new BadRequestException('Por favor, informe a pasta corretamente');

    if (!this.allowedFolders.includes(folder))
      throw new BadRequestException('Pasta de upload não permitida');

    if (isPublic && !this.publicFolders.includes(folder)) {
      throw new BadRequestException('Esta pasta requer autenticação');
    }

    if (!fileType || typeof fileType !== 'string')
      throw new BadRequestException('Por favor, informe o tipo de ficheiro');

    if (!this.allowedMimeTypes.includes(fileType))
      throw new BadRequestException('Tipo de ficheiro não suportado');

    const maxSize = fileType.startsWith('video/')
      ? 100 * 1024 * 1024
      : 5 * 1024 * 1024;

    if (size > maxSize) {
      const limit = fileType.startsWith('video/') ? '100 MB' : '5 MB';
      throw new BadRequestException(`O tamanho máximo permitido é de ${limit}`);
    }

    return size;
  }
}
