import {
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { CommunityMessageType } from '../enums/community-message-type.enum';

export class CreateCommunityMessageDto {
  @IsEnum(CommunityMessageType, {
    message: 'Escolhe texto, imagem, vídeo ou áudio para a mensagem.',
  })
  type: CommunityMessageType;

  @ValidateIf((message) => message.type === CommunityMessageType.TEXT)
  @IsString({ message: 'A mensagem deve ser um texto.' })
  @IsNotEmpty({ message: 'Escreve a mensagem.' })
  @MaxLength(5000, {
    message: 'A mensagem pode ter no máximo 5000 caracteres.',
  })
  content?: string;

  @ValidateIf((message) => message.type !== CommunityMessageType.TEXT)
  @IsUrl({}, { message: 'Indica um endereço válido para o ficheiro.' })
  @IsNotEmpty({ message: 'Indica o endereço do ficheiro.' })
  @MaxLength(2048, { message: 'O endereço do ficheiro é demasiado longo.' })
  mediaUrl?: string;
}
