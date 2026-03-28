import { Inject, Injectable } from '@nestjs/common';

import {
  VISION_DRAFT_PROVIDER,
  VisionDraftProvider,
  VisionDraftRequest,
} from './vision-draft-provider';
import { isCompleteVisionDraftPatch, normalizeVisionDraftPatch } from './ai-normalization';

@Injectable()
export class AiService {
  constructor(
    @Inject(VISION_DRAFT_PROVIDER) private readonly visionDraftProvider: VisionDraftProvider,
  ) {}

  async generateDraft(input: VisionDraftRequest) {
    try {
      const draftPatch = normalizeVisionDraftPatch(
        await this.visionDraftProvider.generateDraftFromImage(input),
      );

      if (!isCompleteVisionDraftPatch(draftPatch)) {
        throw new Error('Vision draft patch was incomplete.');
      }

      return {
        draftPatch,
        status: 'ready',
      };
    } catch {
      return {
        message: "L'IA n'a pas pu préparer ce brouillon. Continuez manuellement.",
        status: 'manual_fallback',
      };
    }
  }
}
