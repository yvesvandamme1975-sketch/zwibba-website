import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';

import type { SessionRecord } from '../auth/auth.service';
import { CurrentSession } from '../auth/current-session.decorator';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly mediaService: MediaService) {}

  @Post('upload-url')
  async createUploadUrl(
    @Body()
    body: {
      contentType?: string;
      fileName?: string;
      sourcePresetId?: string;
    },
  ) {
    return this.mediaService.createUploadSlot({
      contentType: body.contentType ?? 'application/octet-stream',
      fileName: body.fileName ?? 'upload.bin',
      sourcePresetId: body.sourcePresetId ?? 'capture',
    });
  }

  @Post('discard-uploaded')
  @UseGuards(SessionAuthGuard)
  async discardUploaded(
    @CurrentSession() session: SessionRecord,
    @Body()
    body: {
      objectKeys?: string[];
    },
  ) {
    return this.mediaService.discardUploadedObjects({
      objectKeys: body.objectKeys ?? [],
      phoneNumber: session.phoneNumber,
    });
  }
}
