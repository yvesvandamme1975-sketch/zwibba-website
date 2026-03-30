import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthService, type SessionRecord } from '../auth/auth.service';
import { CurrentSession } from '../auth/current-session.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
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

  @Post(':listingId/lifecycle')
  @HttpCode(200)
  @UseGuards(SessionAuthGuard)
  applyLifecycleAction(
    @Body() body: {
      action?: string;
      reasonCode?: string;
    },
    @CurrentSession() session: SessionRecord,
    @Param('listingId') listingId: string,
  ) {
    return this.listingsService.applyLifecycleAction({
      action: body?.action ?? '',
      listingId,
      reasonCode: body?.reasonCode ?? '',
      session,
    });
  }

  @Get(':slug')
  async getListingDetail(
    @Headers('authorization') authorization: string | undefined,
    @Param('slug') slug: string,
  ) {
    const session = await this.authService.findSessionToken(
      authorization?.replace(/^Bearer\s+/i, '').trim(),
    );

    return this.listingsService.getListingDetail(slug, session ?? undefined);
  }
}
