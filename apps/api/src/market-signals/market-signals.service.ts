import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { buildSearchQueryEventInput } from './market-signals-payload';

@Injectable()
export class MarketSignalsService {
  constructor(
    @Inject(PrismaService) private readonly prismaService: PrismaService,
  ) {}

  async recordSearchQuery(input: {
    countryCode: unknown;
    rawQuery: unknown;
    resultCount: unknown;
    selectedCategoryId?: unknown;
  }): Promise<void> {
    const data = buildSearchQueryEventInput(input);
    if (!data) {
      return;
    }

    try {
      await this.prismaService.searchQueryEvent.create({ data });
    } catch {}
  }
}
