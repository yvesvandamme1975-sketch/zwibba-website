import { Body, Controller, Inject, Post } from '@nestjs/common';

import { BoostService } from './boost.service';

@Controller('boost')
export class BoostController {
  constructor(
    @Inject(BoostService) private readonly boostService: BoostService,
  ) {}

  @Post()
  activateBoost(@Body('listingId') listingId: string) {
    return this.boostService.activateBoost(listingId);
  }
}
