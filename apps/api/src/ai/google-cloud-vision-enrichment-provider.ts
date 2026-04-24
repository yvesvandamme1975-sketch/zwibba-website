import type { GoogleVisionEnrichmentProvider } from './google-vision-enrichment-provider';
import type { GoogleVisionSignals } from './google-vision-signals';
import type { VisionDraftRequest } from './vision-draft-provider';
import { fetchPhotoAsBase64 } from './vision-provider-utils';
import { extractGoogleVisionSignals } from './google-cloud-vision-utils';

type FetchLike = typeof fetch;

type GoogleCloudVisionEnrichmentProviderOptions = {
  apiKey: string;
  fetchFn?: FetchLike;
  projectId: string;
};

export class GoogleCloudVisionEnrichmentProvider implements GoogleVisionEnrichmentProvider {
  #apiKey: string;
  #fetchFn: FetchLike;
  #projectId: string;

  constructor({
    apiKey,
    fetchFn = fetch,
    projectId,
  }: GoogleCloudVisionEnrichmentProviderOptions) {
    this.#apiKey = apiKey;
    this.#fetchFn = fetchFn;
    this.#projectId = projectId;
  }

  async collectSignalsFromImage(input: VisionDraftRequest): Promise<GoogleVisionSignals> {
    const photo = await fetchPhotoAsBase64(input, this.#fetchFn);
    const response = await this.#fetchFn(
      `https://vision.googleapis.com/v1/images:annotate?key=${this.#apiKey}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-user-project': this.#projectId,
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: photo.base64Data,
              },
              features: [
                { type: 'LABEL_DETECTION', maxResults: 10 },
                { type: 'LOGO_DETECTION', maxResults: 5 },
                { type: 'TEXT_DETECTION', maxResults: 20 },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Cloud Vision request failed with status ${response.status}.`);
    }

    return extractGoogleVisionSignals((await response.json()) as Record<string, unknown>);
  }
}
