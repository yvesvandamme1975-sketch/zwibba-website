import { Body, Controller, Delete, Inject, Param, Post, UseGuards } from '@nestjs/common';

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
      priceAmount?: number;
      priceCdf?: number;
      priceCurrency?: string;
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
      priceAmount: body.priceAmount,
      priceCdf: body.priceCdf,
      priceCurrency: body.priceCurrency,
      title: body.title ?? '',
    });
  }

  @Delete(':draftId')
  @UseGuards(SessionAuthGuard)
  deleteDraft(
    @CurrentSession() session: SessionRecord,
    @Param('draftId') draftId: string,
  ) {
    return this.draftsService.deleteDraft({
      draftId,
      phoneNumber: session.phoneNumber,
    });
  }
}
