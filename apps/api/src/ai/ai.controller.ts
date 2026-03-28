import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';

import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(@Inject(AiService) private readonly aiService: AiService) {}

  @Post('draft')
  createDraft(@Body() body: { contentType?: string; objectKey?: string; photoUrl?: string }) {
    const photoUrl = String(body.photoUrl ?? '').trim();

    if (!photoUrl) {
      throw new BadRequestException('Une photo téléversée est requise pour préparer le brouillon.');
    }

    return this.aiService.generateDraft({
      contentType: body.contentType ?? '',
      objectKey: body.objectKey ?? '',
      photoUrl,
    });
  }
}
