import assert from 'node:assert/strict';
import test from 'node:test';

import { createAiDraftService } from '../App/services/ai-draft.mjs';
import { createImageCompressionService } from '../App/services/image-compression.mjs';

test('large images are compressed before upload', () => {
  const compressionService = createImageCompressionService({
    maxBytes: 1_500_000,
  });

  const result = compressionService.compressImage({
    id: 'phone-front',
    previewUrl: '/assets/demo/phone-front.jpg',
    sizeBytes: 3_400_000,
    width: 2400,
    height: 3200,
  });

  assert.equal(result.wasCompressed, true);
  assert.equal(result.originalSizeBytes, 3_400_000);
  assert.equal(result.sizeBytes, 1_500_000);
});

test('AI draft response maps into title, category, condition, and description only', async () => {
  const aiDraftService = createAiDraftService({
    responder: async () => ({
      title: 'Samsung Galaxy A54 128 Go',
      category_id: 'phones_tablets',
      condition: 'like_new',
      description: 'Téléphone propre avec boîte et chargeur.',
      price_range_cdf: {
        min: 300_000,
        max: 360_000,
      },
    }),
  });

  const result = await aiDraftService.generateDraft({
    id: 'phone-front',
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.draftPatch.title, 'Samsung Galaxy A54 128 Go');
  assert.equal(result.draftPatch.categoryId, 'phones_tablets');
  assert.equal(result.draftPatch.condition, 'like_new');
  assert.equal(result.draftPatch.description, 'Téléphone propre avec boîte et chargeur.');
  assert.equal('suggestedPriceMinCdf' in result.draftPatch, false);
  assert.equal('suggestedPriceMaxCdf' in result.draftPatch, false);
});

test('AI draft service sends the uploaded photo URL to the live API', async () => {
  const requests = [];
  const aiDraftService = createAiDraftService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options) => {
      requests.push({
        body: JSON.parse(options.body),
        options,
        url,
      });

      return {
        ok: true,
        async json() {
          return {
            status: 'ready',
            draftPatch: {
              title: 'Samsung Galaxy A54 128 Go',
              categoryId: 'phones_tablets',
              condition: 'like_new',
              description: 'Téléphone propre avec boîte et chargeur.',
            },
          };
        },
      };
    },
  });

  const result = await aiDraftService.generateDraft({
    contentType: 'image/jpeg',
    objectKey: 'draft-photos/capture/photo_1-phone.jpg',
    publicUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.example.test/ai/draft');
  assert.deepEqual(requests[0].body, {
    contentType: 'image/jpeg',
    objectKey: 'draft-photos/capture/photo_1-phone.jpg',
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
  });
});

test('AI failure returns a manual-entry fallback state', async () => {
  const aiDraftService = createAiDraftService({
    responder: async () => {
      throw new Error('Claude timeout');
    },
  });

  const result = await aiDraftService.generateDraft({
    id: 'phone-front',
  });

  assert.equal(result.status, 'manual_fallback');
  assert.match(result.message, /manuellement/i);
});

test('AI draft service falls back when a ready response is missing the title', async () => {
  const aiDraftService = createAiDraftService({
    responder: async () => ({
      status: 'ready',
      draftPatch: {
        categoryId: 'electronics',
        condition: 'used_good',
        description: 'Article visible, descriptif initial généré par IA.',
        title: '',
      },
    }),
  });

  const result = await aiDraftService.generateDraft({
    objectKey: 'draft-photos/capture/photo_1-cake.jpg',
    publicUrl: 'https://pub.example.test/draft-photos/capture/photo_1-cake.jpg',
  });

  assert.equal(result.status, 'manual_fallback');
  assert.match(result.message, /manuellement/i);
});
