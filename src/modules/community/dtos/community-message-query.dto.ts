import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class CommunityMessageQueryDto {
  @Type(() => Number)
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página deve ser, pelo menos, 1.' })
  page = 1;

  @Type(() => Number)
  @IsInt({ message: 'O limite deve ser um número inteiro.' })
  @Min(1, { message: 'O limite mínimo é 1.' })
  @Max(100, { message: 'O limite máximo é 100 mensagens.' })
  limit = 20;
}
