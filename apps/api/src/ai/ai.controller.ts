import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  Inject,
  Post,
  Req,
} from '@nestjs/common';

import { AI_DRAFT_PHOTO_BASE_URL, isAllowedDraftPhotoUrl, resolveClientIp } from './ai-draft-guardrails';
import { AiDraftLimiterService } from './ai-draft-limiter.service';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(
    @Inject(AiService) private readonly aiService: AiService,
    @Inject(AiDraftLimiterService)
    private readonly draftLimiter: AiDraftLimiterService,
    @Inject(AI_DRAFT_PHOTO_BASE_URL) private readonly photoBaseUrl: string,
  ) {}

  @Post('draft')
  createDraft(
    @Body() body: { contentType?: string; objectKey?: string; photoUrl?: string },
    @Req()
    request: {
      headers: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
    },
  ) {
    const photoUrl = String(body.photoUrl ?? '').trim();

    if (!photoUrl) {
      throw new BadRequestException('Une photo téléversée est requise pour préparer le brouillon.');
    }

    if (!isAllowedDraftPhotoUrl(photoUrl, this.photoBaseUrl)) {
      throw new BadRequestException("Cette photo ne provient pas d'un téléversement Zwibba.");
    }

    const limiterResult = this.draftLimiter.evaluateDraftRequest(
      resolveClientIp(request.headers, request.socket?.remoteAddress),
    );

    if (limiterResult === 'ip_rate_exceeded') {
      throw new HttpException(
        'Trop de brouillons IA demandés. Réessayez dans quelques minutes.',
        429,
      );
    }

    if (limiterResult === 'daily_cap_reached') {
      return {
        message: "L'IA n'a pas pu préparer ce brouillon. Continuez manuellement.",
        status: 'manual_fallback',
      };
    }

    return this.aiService.generateDraft({
      contentType: body.contentType ?? '',
      objectKey: body.objectKey ?? '',
      photoUrl,
    });
  }
}
