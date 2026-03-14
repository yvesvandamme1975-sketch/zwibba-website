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

test('AI draft response maps into title, category, condition, description, and price range', async () => {
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
  assert.equal(result.draftPatch.suggestedPriceMinCdf, 300_000);
  assert.equal(result.draftPatch.suggestedPriceMaxCdf, 360_000);
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
