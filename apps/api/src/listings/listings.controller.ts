import { Controller, Get, Inject, Param } from '@nestjs/common';

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

  @Get(':slug')
  getListingDetail(@Param('slug') slug: string) {
    return this.listingsService.getListingDetail(slug);
  }
}
