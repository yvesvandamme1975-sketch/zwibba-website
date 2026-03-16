import { Body, Controller, Get, Headers, Inject, Post } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { ModerationService } from './moderation.service';

@Controller('moderation')
export class ModerationController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(ModerationService)
    private readonly moderationService: ModerationService,
  ) {}

  @Post('publish')
  publish(
    @Headers('authorization') authorizationHeader: string | undefined,
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
    const sessionToken = authorizationHeader?.replace(/^Bearer\s+/i, '').trim();
    const session = this.authService.requireSessionToken(sessionToken);

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
