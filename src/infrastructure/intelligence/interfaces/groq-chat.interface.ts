export const GROQ_CHAT = 'GROQ_CHAT';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqJsonSchema {
  name: string;
  schema: Record<string, unknown>;
}

export interface GroqChat {
  complete(messages: GroqMessage[], schema?: GroqJsonSchema): Promise<string>;
}
