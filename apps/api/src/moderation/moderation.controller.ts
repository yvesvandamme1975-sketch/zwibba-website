import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { CurrentSession } from '../auth/current-session.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { ModerationService } from './moderation.service';

@Controller('moderation')
export class ModerationController {
  constructor(
    @Inject(ModerationService)
    private readonly moderationService: ModerationService,
  ) {}

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
}
