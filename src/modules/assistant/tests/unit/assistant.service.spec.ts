import { AssistantService } from '../../services/assistant.service';

describe('AssistantService', () => {
  const interpretation = (overrides = {}) => ({
    intent: 'other' as const,
    resources: [],
    searchTerms: [],
    location: null,
    clarificationQuestion: null,
    directAnswer: 'Resposta direta',
    ...overrides,
  });

  let ai: any;
  let jobs: any;
  let housing: any;
  let community: any;
  let service: AssistantService;

  beforeEach(() => {
    ai = {
      interpret: jest.fn(),
      answer: jest.fn(),
    };

    jobs = {
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    housing = {
      findAll: jest.fn(),
    };

    community = {
      findAll: jest.fn(),
    };

    service = new AssistantService(ai, jobs, housing, community);
  });

  it('returns a direct interpretation without querying domain resources', async () => {
    ai.interpret.mockResolvedValue(interpretation());

    await expect(service.ask('Olá')).resolves.toEqual({
      answer: 'Resposta direta',
    });

    expect(ai.answer).not.toHaveBeenCalled();
    expect(jobs.findAll).not.toHaveBeenCalled();
    expect(housing.findAll).not.toHaveBeenCalled();
    expect(community.findAll).not.toHaveBeenCalled();
  });

  it('only queries resources allowed for the interpreted intent', async () => {
    ai.interpret.mockResolvedValue(
      interpretation({
        intent: 'job_search',
        resources: ['jobs', 'housing', 'community'],
        directAnswer: 'Vou procurar oportunidades de emprego.',
      }),
    );

    jobs.findAll.mockResolvedValue({
      items: [],
      pagination: { totalPages: 1 },
    });

    ai.answer.mockResolvedValue('Resposta com dados');

    await expect(service.ask('Procuro emprego')).resolves.toEqual({
      answer: 'Resposta com dados',
    });

    expect(jobs.findAll).toHaveBeenCalledTimes(1);
    expect(housing.findAll).not.toHaveBeenCalled();
    expect(community.findAll).not.toHaveBeenCalled();

    expect(ai.answer).toHaveBeenCalledWith(
      'Procuro emprego',
      expect.objectContaining({
        intent: 'job_search',
        resources: ['jobs'],
        directAnswer: 'Vou procurar oportunidades de emprego.',
      }),
      { jobs: [] },
    );
  });

  it('returns a clarification question without querying modules', async () => {
    ai.interpret.mockResolvedValue(
      interpretation({
        clarificationQuestion: 'Procuras emprego, alojamento ou publicações?',
        directAnswer: null,
      }),
    );

    await expect(service.ask('Procuro algo')).resolves.toEqual({
      answer: 'Procuras emprego, alojamento ou publicações?',
      clarificationQuestion: 'Procuras emprego, alojamento ou publicações?',
    });

    expect(ai.answer).not.toHaveBeenCalled();
    expect(jobs.findAll).not.toHaveBeenCalled();
    expect(housing.findAll).not.toHaveBeenCalled();
    expect(community.findAll).not.toHaveBeenCalled();
  });

  it('uses a preliminary answer together with empty internal search results', async () => {
    ai.interpret.mockResolvedValue(
      interpretation({
        intent: 'housing_search',
        resources: ['housing'],
        directAnswer: 'Posso explicar as opções de alojamento.',
      }),
    );

    housing.findAll.mockResolvedValue({
      items: [],
      pagination: { totalPages: 1 },
    });

    ai.answer.mockResolvedValue(
      'Explicação geral. Não foram encontrados registos relevantes nos dados disponibilizados.',
    );

    await expect(service.ask('Procuro alojamento')).resolves.toEqual({
      answer:
        'Explicação geral. Não foram encontrados registos relevantes nos dados disponibilizados.',
    });

    expect(ai.answer).toHaveBeenCalledWith(
      'Procuro alojamento',
      expect.objectContaining({
        intent: 'housing_search',
        resources: ['housing'],
        directAnswer: 'Posso explicar as opções de alojamento.',
      }),
      { housing: [] },
    );
  });

  it('queries community publications for community_search intent', async () => {
    ai.interpret.mockResolvedValue(
      interpretation({
        intent: 'community_search',
        resources: ['community'],
        searchTerms: ['tecnologia'],
        directAnswer: null,
      }),
    );

    community.findAll.mockResolvedValue({
      items: [
        { id: '1', title: 'Comunidade de tecnologia' },
        { id: '2', title: 'Receitas de cozinha' },
      ],
      pagination: { totalPages: 1 },
    });

    ai.answer.mockResolvedValue('Encontrei uma publicação relevante.');

    await expect(
      service.ask('Procuro tecnologia na comunidade'),
    ).resolves.toEqual({
      answer: 'Encontrei uma publicação relevante.',
    });

    expect(community.findAll).toHaveBeenCalledTimes(1);
    expect(jobs.findAll).not.toHaveBeenCalled();
    expect(housing.findAll).not.toHaveBeenCalled();

    expect(ai.answer).toHaveBeenCalledWith(
      'Procuro tecnologia na comunidade',
      expect.objectContaining({
        intent: 'community_search',
        resources: ['community'],
      }),
      {
        community: [{ id: '1', title: 'Comunidade de tecnologia' }],
      },
    );
  });

  it('does not query resources when the intent is other', async () => {
    ai.interpret.mockResolvedValue(
      interpretation({
        intent: 'other',
        resources: ['jobs', 'housing', 'community'],
        directAnswer: null,
      }),
    );

    await expect(service.ask('Uma pergunta não suportada')).resolves.toEqual({
      answer:
        'Não consegui identificar informação suficiente para responder. Reformula a pergunta ou indica se procuras emprego, alojamento ou publicações da comunidade.',
    });

    expect(ai.answer).not.toHaveBeenCalled();
    expect(jobs.findAll).not.toHaveBeenCalled();
    expect(housing.findAll).not.toHaveBeenCalled();
    expect(community.findAll).not.toHaveBeenCalled();
  });
});
