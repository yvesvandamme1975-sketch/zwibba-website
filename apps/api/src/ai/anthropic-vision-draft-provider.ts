import type {
  VisionDraftPatch,
  VisionDraftProvider,
  VisionDraftRequest,
} from './vision-draft-provider';
import { buildVisionDraftPrompt } from './vision-provider-prompt';
import { extractJsonObject } from './vision-provider-utils';

type FetchLike = typeof fetch;

type AnthropicVisionDraftProviderOptions = {
  apiKey: string;
  fetchFn?: FetchLike;
  model: string;
};

export class AnthropicVisionDraftProvider implements VisionDraftProvider {
  #apiKey: string;
  #fetchFn: FetchLike;
  #model: string;

  constructor({
    apiKey,
    fetchFn = fetch,
    model,
  }: AnthropicVisionDraftProviderOptions) {
    this.#apiKey = apiKey;
    this.#fetchFn = fetchFn;
    this.#model = model;
  }

  async generateDraftFromImage(input: VisionDraftRequest): Promise<VisionDraftPatch> {
    const response = await this.#fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'x-api-key': this.#apiKey,
      },
      body: JSON.stringify({
        max_tokens: 300,
        messages: [
          {
            content: [
              {
                source: {
                  type: 'url',
                  url: input.photoUrl,
                },
                type: 'image',
              },
              {
                text: `${buildVisionDraftPrompt()} Réponds uniquement en JSON.`,
                type: 'text',
              },
            ],
            role: 'user',
          },
        ],
        model: this.#model,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic vision request failed with status ${response.status}.`);
    }

    const responseJson = (await response.json()) as Record<string, unknown>;
    const content = Array.isArray(responseJson.content) ? responseJson.content : [];
    const text = typeof (content[0] as Record<string, unknown>)?.text === 'string'
      ? String((content[0] as Record<string, unknown>).text)
      : '';

    if (!text.trim()) {
      throw new Error('Anthropic response did not contain draft JSON.');
    }

    return extractJsonObject(text) as VisionDraftPatch;
  }
}
