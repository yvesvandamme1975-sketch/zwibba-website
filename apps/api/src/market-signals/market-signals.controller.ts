import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';

import { MarketSignalsService } from './market-signals.service';

@Controller('market-signals')
export class MarketSignalsController {
  constructor(
    @Inject(MarketSignalsService)
    private readonly marketSignalsService: MarketSignalsService,
  ) {}

  @Post('search')
  @HttpCode(200)
  async recordSearchQuery(
    @Body()
    body: {
      countryCode?: unknown;
      rawQuery?: unknown;
      resultCount?: unknown;
      selectedCategoryId?: unknown;
    },
  ) {
    try {
      await this.marketSignalsService.recordSearchQuery({
        countryCode: body?.countryCode,
        rawQuery: body?.rawQuery,
        resultCount: body?.resultCount,
        selectedCategoryId: body?.selectedCategoryId,
      });
    } catch {}

    return { ok: true };
  }
}
