import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { CurrentSession } from '../auth/current-session.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { BoostService } from './boost.service';

@Controller('boost')
@UseGuards(SessionAuthGuard)
export class BoostController {
  constructor(
    @Inject(BoostService) private readonly boostService: BoostService,
  ) {}

  @Post()
  activateBoost(
    @CurrentSession() session: SessionRecord,
    @Body('listingId') listingId: string,
  ) {
    return this.boostService.activateBoost({
      listingId,
      session,
    });
  }
}
