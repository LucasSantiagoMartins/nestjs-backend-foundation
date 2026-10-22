export const ASSISTANT_INTELLIGENCE = 'ASSISTANT_INTELLIGENCE';

export type AssistantIntent =
  | 'job_search'
  | 'housing_search'
  | 'community_search'
  | 'general_information'
  | 'other';

export type AssistantResource = 'jobs' | 'housing' | 'community';

export interface AssistantInterpretation {
  intent: AssistantIntent;
  resources: AssistantResource[];
  searchTerms: string[];
  location: string | null;
  clarificationQuestion: string | null;
  directAnswer: string | null;
}

export interface AssistantIntelligence {
  interpret(question: string): Promise<AssistantInterpretation>;

  answer(
    question: string,
    interpretation: AssistantInterpretation,
    data: Record<string, unknown>,
  ): Promise<string>;
}
