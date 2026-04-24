import assert from 'node:assert/strict';
import test from 'node:test';

import { GoogleCloudVisionEnrichmentProvider } from '../../src/ai/google-cloud-vision-enrichment-provider';

test('google cloud vision enrichment provider extracts labels, logos, objects, and OCR text', async () => {
  const provider = new GoogleCloudVisionEnrichmentProvider({
    apiKey: 'vision-api-key',
    fetchFn: async (url, options) => {
      if (String(url) === 'https://cdn.zwibba.example/photo.jpg') {
        return new Response(Buffer.from('fake-image-binary'), {
          headers: {
            'content-type': 'image/jpeg',
          },
          status: 200,
        });
      }

      assert.match(String(url), /vision\.googleapis\.com/);
      assert.equal(options?.method, 'POST');

      return new Response(
        JSON.stringify({
          responses: [
            {
              labelAnnotations: [
                { description: 'Business card' },
                { description: 'Plumbing service' },
              ],
              logoAnnotations: [
                { description: 'Zwibba Pro' },
              ],
              localizedObjectAnnotations: [
                { name: 'Document' },
                { name: 'Poster' },
              ],
              textAnnotations: [
                { description: 'ZWIBBA PRO\nPlomberie 7j/7\n+243 000 000 000' },
              ],
            },
          ],
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        },
      );
    },
    projectId: 'zwibba-prod',
  });

  const signals = await provider.collectSignalsFromImage({
    photoUrl: 'https://cdn.zwibba.example/photo.jpg',
  });

  assert.deepEqual(signals, {
    labels: ['Business card', 'Plumbing service'],
    logos: ['Zwibba Pro'],
    objects: ['Document', 'Poster'],
    ocrText: 'ZWIBBA PRO\nPlomberie 7j/7\n+243 000 000 000',
  });
});

test('google cloud vision enrichment provider returns empty signals when annotations are missing', async () => {
  const provider = new GoogleCloudVisionEnrichmentProvider({
    apiKey: 'vision-api-key',
    fetchFn: async (url) => {
      if (String(url) === 'https://cdn.zwibba.example/photo.jpg') {
        return new Response(Buffer.from('fake-image-binary'), {
          headers: {
            'content-type': 'image/jpeg',
          },
          status: 200,
        });
      }

      return new Response(
        JSON.stringify({
          responses: [{}],
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        },
      );
    },
    projectId: 'zwibba-prod',
  });

  const signals = await provider.collectSignalsFromImage({
    photoUrl: 'https://cdn.zwibba.example/photo.jpg',
  });

  assert.deepEqual(signals, {
    labels: [],
    logos: [],
    objects: [],
    ocrText: '',
  });
});

test('google cloud vision enrichment provider throws when the vision request fails', async () => {
  const provider = new GoogleCloudVisionEnrichmentProvider({
    apiKey: 'vision-api-key',
    fetchFn: async (url) => {
      if (String(url) === 'https://cdn.zwibba.example/photo.jpg') {
        return new Response(Buffer.from('fake-image-binary'), {
          headers: {
            'content-type': 'image/jpeg',
          },
          status: 200,
        });
      }

      return new Response('vision failure', {
        status: 503,
      });
    },
    projectId: 'zwibba-prod',
  });

  await assert.rejects(
    () =>
      provider.collectSignalsFromImage({
        photoUrl: 'https://cdn.zwibba.example/photo.jpg',
      }),
    /Cloud Vision request failed with status 503/,
  );
});
