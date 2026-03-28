import type {
  VisionDraftPatch,
  VisionDraftProvider,
  VisionDraftRequest,
} from './vision-draft-provider';
import { supportedCategoryIds, supportedConditionValues } from './ai-taxonomy';

type FetchLike = typeof fetch;

type OpenAiVisionDraftProviderOptions = {
  apiKey: string;
  fetchFn?: FetchLike;
  model: string;
};

function buildPrompt() {
  return [
    'Analyse la photo produit pour un brouillon de petite annonce Zwibba.',
    'Retourne uniquement un JSON valide.',
    `Choisis categoryId uniquement parmi: ${supportedCategoryIds.join(', ')}.`,
    `Choisis condition uniquement parmi: ${supportedConditionValues.join(', ')}.`,
    "N'inclus jamais de prix ni de fourchette de prix.",
    'Sois conservateur: si la catégorie est incertaine, choisis electronics.',
    'Décris brièvement le produit visible sans inventer de détails invisibles.',
  ].join(' ');
}

function extractTextPayload(responseJson: Record<string, unknown>) {
  if (typeof responseJson.output_text === 'string' && responseJson.output_text.trim()) {
    return responseJson.output_text;
  }

  const output = Array.isArray(responseJson.output) ? responseJson.output : [];

  for (const item of output) {
    const content = Array.isArray((item as { content?: unknown[] }).content)
      ? (item as { content: Array<Record<string, unknown>> }).content
      : [];

    for (const contentItem of content) {
      if (typeof contentItem.text === 'string' && contentItem.text.trim()) {
        return contentItem.text;
      }
    }
  }

  throw new Error('OpenAI response did not contain structured text output.');
}

export class OpenAiVisionDraftProvider implements VisionDraftProvider {
  #apiKey: string;
  #fetchFn: FetchLike;
  #model: string;

  constructor({
    apiKey,
    fetchFn = fetch,
    model,
  }: OpenAiVisionDraftProviderOptions) {
    this.#apiKey = apiKey;
    this.#fetchFn = fetchFn;
    this.#model = model;
  }

  async generateDraftFromImage(input: VisionDraftRequest): Promise<VisionDraftPatch> {
    const response = await this.#fetchFn('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.#apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        input: [
          {
            content: [
              {
                text: buildPrompt(),
                type: 'input_text',
              },
              {
                image_url: input.photoUrl,
                type: 'input_image',
              },
            ],
            role: 'user',
          },
        ],
        model: this.#model,
        text: {
          format: {
            name: 'zwibba_listing_draft',
            schema: {
              additionalProperties: false,
              properties: {
                categoryId: { type: 'string' },
                condition: { type: 'string' },
                description: { type: 'string' },
                title: { type: 'string' },
              },
              required: ['title', 'categoryId', 'condition', 'description'],
              type: 'object',
            },
            type: 'json_schema',
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI vision request failed with status ${response.status}.`);
    }

    const responseJson = (await response.json()) as Record<string, unknown>;
    const textPayload = extractTextPayload(responseJson);

    return JSON.parse(textPayload) as VisionDraftPatch;
  }
}
