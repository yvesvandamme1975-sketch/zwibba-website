import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { derivePriceEventInput } from './listing-price-event';
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

  async recordListingPriceEvent(input: {
    countryCode: unknown;
    draftId: string;
    listingId: string | null;
    previous: { amount: number; currency: string } | null;
    next: { amount: number; currency: string };
    source: string;
  }): Promise<void> {
    const data = derivePriceEventInput(input);
    if (!data) {
      return;
    }

    try {
      await this.prismaService.listingPriceEvent.create({ data });
    } catch {}
  }
}
