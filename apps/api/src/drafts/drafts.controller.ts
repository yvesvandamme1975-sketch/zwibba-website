import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { CurrentSession } from '../auth/current-session.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { DraftsService } from './drafts.service';

@Controller('drafts')
export class DraftsController {
  constructor(@Inject(DraftsService) private readonly draftsService: DraftsService) {}

  @Post('sync')
  @UseGuards(SessionAuthGuard)
  syncDraft(
    @CurrentSession() session: SessionRecord,
    @Body()
    body: {
      area?: string;
      categoryId?: string;
      description?: string;
      draftId?: string;
      photos?: Array<{
        objectKey?: string;
        photoId?: string;
        publicUrl?: string;
        sourcePresetId?: string;
        uploadStatus?: string;
      }>;
      priceCdf?: number;
      title?: string;
    },
  ) {
    return this.draftsService.syncDraft({
      area: body.area ?? '',
      categoryId: body.categoryId ?? '',
      description: body.description ?? '',
      draftId: body.draftId,
      phoneNumber: session.phoneNumber,
      photos: (body.photos ?? []).map((photo) => ({
        objectKey: photo.objectKey ?? '',
        photoId: photo.photoId ?? '',
        publicUrl: photo.publicUrl ?? '',
        sourcePresetId: photo.sourcePresetId ?? '',
        uploadStatus: photo.uploadStatus ?? 'pending',
      })),
      priceCdf: body.priceCdf ?? 0,
      title: body.title ?? '',
    });
  }
}
