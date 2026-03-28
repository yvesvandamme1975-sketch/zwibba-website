type FetchLike = typeof fetch;

import type { VisionDraftRequest } from './vision-draft-provider';

export function extractJsonObject(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed) as Record<string, unknown>;
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  }

  throw new Error('Provider did not return a JSON object.');
}

export async function fetchPhotoAsBase64(
  input: VisionDraftRequest,
  fetchFn: FetchLike = fetch,
) {
  const response = await fetchFn(input.photoUrl);

  if (!response.ok) {
    throw new Error(`Unable to load uploaded photo with status ${response.status}.`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());

  return {
    base64Data: bytes.toString('base64'),
    mimeType: input.contentType || response.headers.get('content-type') || 'image/jpeg',
  };
}
