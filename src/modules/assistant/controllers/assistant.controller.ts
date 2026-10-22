import { Body, Controller, Post } from '@nestjs/common';
import { AskAssistantDto } from '../dtos/ask-assistant.dto';
import { AssistantService } from '../services/assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('ask')
  ask(@Body() dto: AskAssistantDto) {
    return this.assistant.ask(dto.question);
  }
}
