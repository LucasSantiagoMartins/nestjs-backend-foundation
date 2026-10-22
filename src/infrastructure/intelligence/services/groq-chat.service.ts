import { AppLogger } from '@backend-foundation/common/logger/logger.service';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import {
  GroqChat,
  GroqJsonSchema,
  GroqMessage,
} from '../interfaces/groq-chat.interface';

@Injectable()
export class GroqChatService implements GroqChat {
  private readonly client: Groq;
  private readonly model: string;

  constructor(
    config: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.client = new Groq({
      apiKey: config.getOrThrow<string>('groq.apiKey'),
    });
    this.model = config.getOrThrow<string>('groq.model');
  }

  async complete(
    messages: GroqMessage[],
    schema?: GroqJsonSchema,
  ): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        ...(schema
          ? {
              response_format: {
                type: 'json_schema',
                json_schema: { ...schema, strict: true },
              },
            }
          : {}),
      });
      const content = completion.choices[0]?.message?.content;
      if (!content?.trim()) throw new Error('Groq returned an empty response');
      return content;
    } catch (error) {
      this.logger.error({
        msg: 'Groq chat completion failed.',
        action: 'GROQ_CHAT_COMPLETION_ERROR',
        service: 'GroqChat',
        error,
      });
      throw new BadGatewayException(
        'Não foi possível obter uma resposta do serviço de inteligência.',
      );
    }
  }
}
