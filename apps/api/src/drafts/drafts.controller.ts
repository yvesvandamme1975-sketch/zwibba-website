import { Body, Controller, Headers, Inject, Post } from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { DraftsService } from './drafts.service';

@Controller('drafts')
export class DraftsController {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(DraftsService) private readonly draftsService: DraftsService,
  ) {}

  @Post('sync')
  syncDraft(
    @Headers('authorization') authorizationHeader: string | undefined,
    @Body()
    body: {
      area?: string;
      categoryId?: string;
      priceCdf?: number;
      title?: string;
    },
  ) {
    const sessionToken = authorizationHeader?.replace(/^Bearer\s+/i, '').trim();
    const session = this.authService.requireSessionToken(sessionToken);

    return this.draftsService.syncDraft({
      area: body.area ?? '',
      categoryId: body.categoryId ?? '',
      phoneNumber: session.phoneNumber,
      priceCdf: body.priceCdf ?? 0,
      title: body.title ?? '',
    });
  }
}
