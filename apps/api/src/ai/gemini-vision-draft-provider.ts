import type {
  VisionDraftPatch,
  VisionDraftProvider,
  VisionDraftRequest,
} from './vision-draft-provider';
import { buildVisionDraftPrompt } from './vision-provider-prompt';
import { extractJsonObject, fetchPhotoAsBase64 } from './vision-provider-utils';

type FetchLike = typeof fetch;

type GeminiVisionDraftProviderOptions = {
  apiKey: string;
  fetchFn?: FetchLike;
  model: string;
};

export class GeminiVisionDraftProvider implements VisionDraftProvider {
  #apiKey: string;
  #fetchFn: FetchLike;
  #model: string;

  constructor({
    apiKey,
    fetchFn = fetch,
    model,
  }: GeminiVisionDraftProviderOptions) {
    this.#apiKey = apiKey;
    this.#fetchFn = fetchFn;
    this.#model = model;
  }

  async generateDraftFromImage(input: VisionDraftRequest): Promise<VisionDraftPatch> {
    const photo = await fetchPhotoAsBase64(input, this.#fetchFn);
    const response = await this.#fetchFn(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.#model}:generateContent?key=${this.#apiKey}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildVisionDraftPrompt(),
                },
                {
                  inlineData: {
                    data: photo.base64Data,
                    mimeType: photo.mimeType,
                  },
                },
              ],
              role: 'user',
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini vision request failed with status ${response.status}.`);
    }

    const responseJson = (await response.json()) as Record<string, unknown>;
    const candidates = Array.isArray(responseJson.candidates) ? responseJson.candidates : [];
    const parts = Array.isArray((candidates[0] as { content?: { parts?: unknown[] } })?.content?.parts)
      ? ((candidates[0] as { content: { parts: Array<Record<string, unknown>> } }).content.parts)
      : [];
    const text = typeof parts[0]?.text === 'string' ? parts[0].text : '';

    if (!text.trim()) {
      throw new Error('Gemini response did not contain draft JSON.');
    }

    return extractJsonObject(text) as VisionDraftPatch;
  }
}
