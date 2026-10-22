import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import groqConfig from '@config/groq.config';
import { GROQ_CHAT } from './interfaces/groq-chat.interface';
import { GroqChatService } from './services/groq-chat.service';
import { AssistantIntelligenceService } from './services/assistant-intelligence.service';
import { ASSISTANT_INTELLIGENCE } from './interfaces/assistant-intelligence.interface';

@Module({
  imports: [ConfigModule.forFeature(groqConfig)],
  providers: [
    GroqChatService,
    AssistantIntelligenceService,
    { provide: GROQ_CHAT, useExisting: GroqChatService },
    {
      provide: ASSISTANT_INTELLIGENCE,
      useExisting: AssistantIntelligenceService,
    },
  ],
  exports: [GROQ_CHAT, ASSISTANT_INTELLIGENCE],
})
export class IntelligenceModule {}
