import type { GoogleVisionSignals } from './google-vision-signals';
import type { VisionDraftRequest } from './vision-draft-provider';

export interface GoogleVisionEnrichmentProvider {
  collectSignalsFromImage(input: VisionDraftRequest): Promise<GoogleVisionSignals>;
}

export const GOOGLE_VISION_ENRICHMENT_PROVIDER = Symbol('GOOGLE_VISION_ENRICHMENT_PROVIDER');

