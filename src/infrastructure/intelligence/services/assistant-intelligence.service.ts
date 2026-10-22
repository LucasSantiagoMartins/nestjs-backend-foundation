import { BadGatewayException, Inject, Injectable } from '@nestjs/common';

import {
  GROQ_CHAT,
  GroqChat,
} from '@infra/intelligence/interfaces/groq-chat.interface';

import {
  AssistantInterpretation,
  AssistantIntelligence,
} from '../interfaces/assistant-intelligence.interface';

import { assistantInterpretationSchema } from '../schemas/assistant-interpretation.schema';

import {
  assistantAnswerPrompt,
  assistantInterpretationPrompt,
} from '../prompts/assistant.prompt';

@Injectable()
export class AssistantIntelligenceService implements AssistantIntelligence {
  constructor(
    @Inject(GROQ_CHAT)
    private readonly groq: GroqChat,
  ) {}

  async interpret(question: string): Promise<AssistantInterpretation> {
    const response = await this.groq.complete(
      [
        {
          role: 'system',
          content: assistantInterpretationPrompt,
        },
        {
          role: 'user',
          content: question,
        },
      ],
      {
        name: 'assistant_intent_interpretation',
        schema: assistantInterpretationSchema as Record<string, unknown>,
      },
    );

    let result: AssistantInterpretation;

    try {
      result = JSON.parse(response);
    } catch {
      throw new BadGatewayException(
        'Resposta estruturada inválida do assistente.',
      );
    }

    const intents = [
      'job_search',
      'housing_search',
      'community_search',
      'general_information',
      'other',
    ];

    const resources = ['jobs', 'housing', 'community'];

    if (
      !result ||
      typeof result !== 'object' ||
      !intents.includes(result.intent) ||
      !Array.isArray(result.resources) ||
      result.resources.some(
        (item) => typeof item !== 'string' || !resources.includes(item),
      )
    ) {
      throw new BadGatewayException(
        'Resposta estruturada inválida do assistente.',
      );
    }

    return {
      ...result,
      resources: [...new Set(result.resources)],
      searchTerms: Array.isArray(result.searchTerms)
        ? result.searchTerms
            .filter(
              (term): term is string =>
                typeof term === 'string' && term.trim().length > 0,
            )
            .map((term) => term.trim())
            .slice(0, 8)
        : [],
      location: typeof result.location === 'string' ? result.location : null,
      clarificationQuestion:
        typeof result.clarificationQuestion === 'string'
          ? result.clarificationQuestion
          : null,
      directAnswer:
        typeof result.directAnswer === 'string' ? result.directAnswer : null,
    };
  }

  answer(
    question: string,
    interpretation: AssistantInterpretation,
    data: Record<string, unknown>,
  ): Promise<string> {
    return this.groq.complete([
      {
        role: 'system',
        content: assistantAnswerPrompt,
      },
      {
        role: 'user',
        content: JSON.stringify({
          question,
          interpretation,
          preliminaryAnswer: interpretation.directAnswer,
          retrievedData: data,
        }),
      },
    ]);
  }
}
