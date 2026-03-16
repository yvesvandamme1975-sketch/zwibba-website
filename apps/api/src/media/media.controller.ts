import { Body, Controller, Inject, Post } from '@nestjs/common';

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
}
