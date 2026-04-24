import { Inject, Injectable, Optional } from '@nestjs/common';

import { fuseGoogleVisionSignalsIntoDraft } from './google-hybrid-draft-fusion';
import {
  GOOGLE_VISION_ENRICHMENT_PROVIDER,
  type GoogleVisionEnrichmentProvider,
} from './google-vision-enrichment-provider';
import {
  VISION_DRAFT_PROVIDER,
  VisionDraftProvider,
  VisionDraftRequest,
} from './vision-draft-provider';
import { isCompleteVisionDraftPatch, normalizeVisionDraftPatch } from './ai-normalization';

type AiServiceDependencies = {
  googleVisionEnrichmentProvider?: GoogleVisionEnrichmentProvider;
  visionDraftProvider: VisionDraftProvider;
};

function isVisionDraftProvider(candidate: unknown): candidate is VisionDraftProvider {
  return Boolean(
    candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as VisionDraftProvider).generateDraftFromImage === 'function',
  );
}

@Injectable()
export class AiService {
  private readonly googleVisionEnrichmentProvider?: GoogleVisionEnrichmentProvider;
  private readonly visionDraftProvider: VisionDraftProvider;

  constructor(
    @Inject(VISION_DRAFT_PROVIDER)
    dependencies: VisionDraftProvider | AiServiceDependencies,
    @Optional()
    @Inject(GOOGLE_VISION_ENRICHMENT_PROVIDER)
    injectedGoogleVisionEnrichmentProvider?: GoogleVisionEnrichmentProvider | null,
  ) {
    if (isVisionDraftProvider(dependencies)) {
      this.visionDraftProvider = dependencies;
      this.googleVisionEnrichmentProvider = injectedGoogleVisionEnrichmentProvider ?? undefined;
      return;
    }

    this.googleVisionEnrichmentProvider = dependencies.googleVisionEnrichmentProvider;
    this.visionDraftProvider = dependencies.visionDraftProvider;
  }

  async generateDraft(input: VisionDraftRequest) {
    try {
      const geminiDraftPatch = normalizeVisionDraftPatch(
        await this.visionDraftProvider.generateDraftFromImage(input),
      );
      let draftPatch = geminiDraftPatch;

      if (this.googleVisionEnrichmentProvider) {
        try {
          draftPatch = normalizeVisionDraftPatch(
            fuseGoogleVisionSignalsIntoDraft({
              draftPatch: geminiDraftPatch,
              signals: await this.googleVisionEnrichmentProvider.collectSignalsFromImage(input),
            }),
          );
        } catch {
          draftPatch = geminiDraftPatch;
        }
      }

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
