import type {
  VisionDraftPatch,
  VisionDraftProvider,
  VisionDraftRequest,
} from './vision-draft-provider';

export class FallbackVisionDraftProvider implements VisionDraftProvider {
  #providers: VisionDraftProvider[];

  constructor(providers: VisionDraftProvider[]) {
    this.#providers = providers;
  }

  async generateDraftFromImage(input: VisionDraftRequest): Promise<VisionDraftPatch> {
    let lastError: unknown = null;

    for (const provider of this.#providers) {
      try {
        return await provider.generateDraftFromImage(input);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('No AI provider succeeded.');
  }
}
