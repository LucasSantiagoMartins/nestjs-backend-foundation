import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AskAssistantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  question: string;
}
