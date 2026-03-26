import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { CurrentSession } from '../auth/current-session.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(
    @Inject(ListingsService) private readonly listingsService: ListingsService,
  ) {}

  @Get()
  listBrowseFeed() {
    return this.listingsService.listBrowseFeed();
  }

  @Get('mine')
  @UseGuards(SessionAuthGuard)
  listSellerListings(@CurrentSession() session: SessionRecord) {
    return this.listingsService.listSellerListings(session);
  }

  @Get(':slug')
  getListingDetail(@Param('slug') slug: string) {
    return this.listingsService.getListingDetail(slug);
  }
}
