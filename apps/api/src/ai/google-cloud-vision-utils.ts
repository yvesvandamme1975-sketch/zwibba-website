import type { GoogleVisionSignals } from './google-vision-signals';

function collectDescriptions(
  annotations: unknown,
  field: 'description' | 'name',
) {
  if (!Array.isArray(annotations)) {
    return [];
  }

  return annotations
    .map((annotation) => {
      if (!annotation || typeof annotation !== 'object') {
        return '';
      }

      const value = annotation[field];
      return typeof value === 'string' ? value.trim() : '';
    })
    .filter((value) => value.length > 0);
}

export function extractGoogleVisionSignals(responseJson: Record<string, unknown>): GoogleVisionSignals {
  const responses = Array.isArray(responseJson.responses) ? responseJson.responses : [];
  const firstResponse = responses[0];

  if (!firstResponse || typeof firstResponse !== 'object') {
    return {
      labels: [],
      logos: [],
      objects: [],
      ocrText: '',
    };
  }

  const ocrText = Array.isArray(firstResponse.textAnnotations) &&
      typeof firstResponse.textAnnotations[0]?.description === 'string'
    ? firstResponse.textAnnotations[0].description.trim()
    : '';

  return {
    labels: collectDescriptions(firstResponse.labelAnnotations, 'description'),
    logos: collectDescriptions(firstResponse.logoAnnotations, 'description'),
    objects: collectDescriptions(firstResponse.localizedObjectAnnotations, 'name'),
    ocrText,
  };
}

