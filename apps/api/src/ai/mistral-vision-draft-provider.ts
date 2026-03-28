import type {
  VisionDraftPatch,
  VisionDraftProvider,
  VisionDraftRequest,
} from './vision-draft-provider';
import { buildVisionDraftPrompt } from './vision-provider-prompt';
import { extractJsonObject } from './vision-provider-utils';

type FetchLike = typeof fetch;

type MistralVisionDraftProviderOptions = {
  apiKey: string;
  fetchFn?: FetchLike;
  model: string;
};

export class MistralVisionDraftProvider implements VisionDraftProvider {
  #apiKey: string;
  #fetchFn: FetchLike;
  #model: string;

  constructor({
    apiKey,
    fetchFn = fetch,
    model,
  }: MistralVisionDraftProviderOptions) {
    this.#apiKey = apiKey;
    this.#fetchFn = fetchFn;
    this.#model = model;
  }

  async generateDraftFromImage(input: VisionDraftRequest): Promise<VisionDraftPatch> {
    const response = await this.#fetchFn('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.#apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            content: [
              {
                text: `${buildVisionDraftPrompt()} Réponds uniquement en JSON.`,
                type: 'text',
              },
              {
                image_url: input.photoUrl,
                type: 'image_url',
              },
            ],
            role: 'user',
          },
        ],
        model: this.#model,
        response_format: {
          type: 'json_object',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral vision request failed with status ${response.status}.`);
    }

    const responseJson = (await response.json()) as Record<string, unknown>;
    const choices = Array.isArray(responseJson.choices) ? responseJson.choices : [];
    const content = typeof (choices[0] as { message?: { content?: unknown } })?.message?.content === 'string'
      ? String((choices[0] as { message: { content: string } }).message.content)
      : '';

    if (!content.trim()) {
      throw new Error('Mistral response did not contain draft JSON.');
    }

    return extractJsonObject(content) as VisionDraftPatch;
  }
}
