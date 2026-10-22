import { Inject, Injectable } from '@nestjs/common';

import { HousingQueryService } from '@modules/housing/services/housing-query.service';
import { HousingListingStatus } from '@modules/housing/enums/housing-listing-status.enum';
import { JobService } from '@modules/job/services/job.service';
import { CommunityService } from '@modules/community/services/community.service';

import {
  AssistantInterpretation,
  AssistantResource,
  ASSISTANT_INTELLIGENCE,
  AssistantIntelligence,
} from '@infra/intelligence/interfaces/assistant-intelligence.interface';

const ALLOWED: Record<AssistantInterpretation['intent'], AssistantResource[]> =
  {
    job_search: ['jobs'],
    housing_search: ['housing'],
    community_search: ['community'],
    general_information: [],
    other: [],
  };

@Injectable()
export class AssistantService {
  constructor(
    @Inject(ASSISTANT_INTELLIGENCE)
    private readonly ai: AssistantIntelligence,
    private readonly jobs: JobService,
    private readonly housing: HousingQueryService,
    private readonly community: CommunityService,
  ) {}

  async ask(
    question: string,
  ): Promise<{ answer: string; clarificationQuestion?: string }> {
    const interpretation = await this.ai.interpret(question);

    const allowed = new Set(ALLOWED[interpretation.intent] ?? []);

    const resources = [
      ...new Set(
        interpretation.resources.filter((resource) => allowed.has(resource)),
      ),
    ];

    const safeInterpretation: AssistantInterpretation = {
      ...interpretation,
      resources,
    };

    if (!resources.length && interpretation.clarificationQuestion?.trim()) {
      return {
        answer: interpretation.clarificationQuestion,
        clarificationQuestion: interpretation.clarificationQuestion,
      };
    }

    if (!resources.length) {
      return {
        answer:
          interpretation.directAnswer?.trim() ||
          'Não consegui identificar informação suficiente para responder. Reformula a pergunta ou indica se procuras emprego, alojamento ou publicações da comunidade.',
      };
    }

    const data: Record<string, unknown> = {};

    await Promise.all(
      resources.map(async (resource) => {
        const terms = this.terms(question, interpretation.searchTerms);

        if (resource === 'jobs') {
          const listings = await this.collect((page) =>
            this.jobs.findAll(page, 50),
          );

          const matches = listings.filter(
            (item) =>
              this.matches(item, terms) &&
              (!interpretation.location ||
                this.matches(item, [interpretation.location])),
          );

          data.jobs = await Promise.all(
            matches.slice(0, 10).map((item) => this.jobs.findById(item.id)),
          );
        }

        if (resource === 'housing') {
          const listings = await this.collect((page) =>
            this.housing.findAll(page, 50),
          );

          data.housing = listings
            .filter(
              (item) =>
                item.status === HousingListingStatus.PUBLISHED &&
                this.matches(item, terms) &&
                (!interpretation.location ||
                  this.matches(item, [interpretation.location])),
            )
            .slice(0, 10);
        }

        if (resource === 'community') {
          const publications = await this.collect((page) =>
            this.community.findAll(page, 50),
          );

          data.community = publications
            .filter(
              (item) =>
                this.matches(item, terms) &&
                (!interpretation.location ||
                  this.matches(item, [interpretation.location])),
            )
            .slice(0, 10);
        }
      }),
    );

    const answer = await this.ai.answer(question, safeInterpretation, data);

    return { answer };
  }

  private terms(question: string, terms: string[]): string[] {
    const stop = new Set([
      'quero',
      'procuro',
      'preciso',
      'para',
      'como',
      'quanto',
      'custa',
      'em',
      'de',
      'no',
      'na',
      'uma',
      'um',
      'por',
      'favor',
      'que',
      'com',
      'me',
      'há',
      'tem',
      'ser',
      'ter',
    ]);

    const extracted = question
      .toLocaleLowerCase('pt-PT')
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word.length > 2 && !stop.has(word));

    return [
      ...new Set(
        [...terms, ...extracted]
          .filter((term) => typeof term === 'string')
          .map((term) => term.trim().toLocaleLowerCase('pt-PT'))
          .filter(Boolean),
      ),
    ].slice(0, 12);
  }

  private matches(value: unknown, terms: string[]): boolean {
    if (!terms.length) {
      return true;
    }

    const text = JSON.stringify(value).toLocaleLowerCase('pt-PT');

    return terms.some((term) => text.includes(term.toLocaleLowerCase('pt-PT')));
  }

  private async collect<T>(
    fetch: (page: number) => Promise<{
      items: T[];
      pagination: { totalPages: number };
    }>,
  ): Promise<T[]> {
    const first = await fetch(1);

    const rest = await Promise.all(
      Array.from(
        {
          length: Math.max(0, first.pagination.totalPages - 1),
        },
        (_, index) => fetch(index + 2),
      ),
    );

    return [...first.items, ...rest.flatMap((page) => page.items)];
  }
}
