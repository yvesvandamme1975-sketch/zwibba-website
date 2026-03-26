import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { CurrentSession } from '../auth/current-session.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { loadEnv } from '../config/env';
import { ModerationService } from './moderation.service';

@Controller('moderation')
export class ModerationController {
  private readonly env = loadEnv();

  constructor(
    @Inject(ModerationService)
    private readonly moderationService: ModerationService,
  ) {}

  private requireAdminSecret(candidateSecret = '') {
    if (candidateSecret !== this.env.admin.sharedSecret) {
      throw new UnauthorizedException('Admin secret manquant ou invalide.');
    }
  }

  @Post('publish')
  @UseGuards(SessionAuthGuard)
  publish(
    @CurrentSession() session: SessionRecord,
    @Body()
    body: {
      categoryId?: string;
      description?: string;
      draftId?: string;
      ownerPhoneNumber?: string;
      priceCdf?: number;
      title?: string;
    },
  ) {
    return this.moderationService.publish({
      categoryId: body.categoryId ?? '',
      description: body.description ?? '',
      draftId: body.draftId ?? '',
      ownerPhoneNumber: body.ownerPhoneNumber ?? session.phoneNumber,
      priceCdf: body.priceCdf ?? 0,
      title: body.title ?? '',
    });
  }

  @Get('queue')
  queue() {
    return this.moderationService.listQueue();
  }

  @Post(':listingId/approve')
  approve(
    @Headers('x-zwibba-admin-secret') adminSecret: string,
    @Param('listingId') listingId: string,
  ) {
    this.requireAdminSecret(adminSecret);
    return this.moderationService.approve(listingId);
  }

  @Post(':listingId/block')
  block(
    @Headers('x-zwibba-admin-secret') adminSecret: string,
    @Param('listingId') listingId: string,
    @Body() body: { reasonSummary?: string },
  ) {
    this.requireAdminSecret(adminSecret);
    return this.moderationService.block(listingId, body.reasonSummary ?? '');
  }
}
