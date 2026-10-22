import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Community } from '../entities/community.entity';

@Injectable()
export class CommunitySeed implements OnModuleInit {
  constructor(
    @InjectRepository(Community)
    private readonly communities: Repository<Community>,
  ) {}

  async onModuleInit(): Promise<void> {
    const communities: Partial<Community>[] = [
      {
        name: 'Comunidade Portugal',
        slug: 'portugal',
        countryCode: 'PT',
        countryName: 'Portugal',
        description:
          'Um espaço para partilhar oportunidades de emprego, anunciar ou procurar casas, quartos e alojamentos, divulgar serviços e negócios, trocar experiências, pedir recomendações e conversar sobre assuntos do dia a dia em Portugal.',
        isActive: true,
      },
      {
        name: 'Comunidade Angola',
        slug: 'angola',
        countryCode: 'AO',
        countryName: 'Angola',
        description:
          'Um espaço para partilhar oportunidades de emprego, anunciar ou procurar casas, quartos e alojamentos, divulgar serviços e negócios, trocar experiências, pedir recomendações e conversar sobre assuntos do dia a dia em Angola.',
        isActive: true,
      },
      {
        name: 'Comunidade Brasil',
        slug: 'brasil',
        countryCode: 'BR',
        countryName: 'Brasil',
        description:
          'Um espaço para partilhar oportunidades de emprego, anunciar ou procurar casas, quartos e alojamentos, divulgar serviços e negócios, trocar experiências, pedir recomendações e conversar sobre assuntos do dia a dia no Brasil.',
        isActive: true,
      },
    ];

    for (const community of communities) {
      await this.communities
        .createQueryBuilder()
        .insert()
        .into(Community)
        .values(community)
        .orIgnore()
        .execute();
    }
  }
}
