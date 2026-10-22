export const assistantInterpretationSchema = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      description: 'Intenção principal da mensagem.',
      enum: [
        'job_search',
        'housing_search',
        'community_search',
        'general_information',
        'other',
      ],
    },
    resources: {
      type: 'array',
      description:
        'Recursos disponíveis necessários para responder à mensagem, sem duplicados.',
      items: {
        type: 'string',
        enum: ['jobs', 'housing', 'community'],
      },
    },
    searchTerms: {
      type: 'array',
      description:
        'Termos concretos e curtos para pesquisar nos recursos disponíveis.',
      items: {
        type: 'string',
      },
    },
    location: {
      type: ['string', 'null'],
      description:
        'Localização explicitamente indicada pelo utilizador ou null.',
    },
    clarificationQuestion: {
      type: ['string', 'null'],
      description:
        'Pergunta curta de esclarecimento quando não for possível realizar uma pesquisa inicial útil.',
    },
    directAnswer: {
      type: ['string', 'null'],
      description:
        'Resposta preliminar baseada em conhecimento geral fiável, ou null quando não for possível responder com segurança.',
    },
  },
  required: [
    'intent',
    'resources',
    'searchTerms',
    'location',
    'clarificationQuestion',
    'directAnswer',
  ],
  additionalProperties: false,
} as const;
