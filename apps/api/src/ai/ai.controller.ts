import { Body, Controller, Inject, Post } from '@nestjs/common';

import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(@Inject(AiService) private readonly aiService: AiService) {}

  @Post('draft')
  createDraft(@Body() body: { photoPresetId?: string }) {
    return this.aiService.generateDraft(body.photoPresetId ?? '');
  }
}
