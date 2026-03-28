import assert from 'node:assert/strict';
import test from 'node:test';

import { AiService } from '../../src/ai/ai.service';

test('ai service normalizes a valid provider draft patch', async () => {
  const service = new AiService({
    async generateDraftFromImage() {
      return {
        categoryId: 'phones_tablets',
        condition: 'like_new',
        description: 'Téléphone propre avec boîte et chargeur.',
        title: 'Samsung Galaxy A54 128 Go',
      };
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.deepEqual(result.draftPatch, {
    categoryId: 'phones_tablets',
    condition: 'like_new',
    description: 'Téléphone propre avec boîte et chargeur.',
    title: 'Samsung Galaxy A54 128 Go',
  });
});

test('ai service normalizes invalid category and condition values', async () => {
  const service = new AiService({
    async generateDraftFromImage() {
      return {
        categoryId: 'not-a-real-category',
        condition: 'broken_magic',
        description: 'Article visible, descriptif initial généré par IA.',
        title: 'Annonce préparée par IA',
      };
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.categoryId, 'electronics');
  assert.equal(result.draftPatch.condition, 'used_good');
});

test('ai service ignores any attempted price output from the provider', async () => {
  const service = new AiService({
    async generateDraftFromImage() {
      return {
        categoryId: 'electronics',
        condition: 'used_good',
        description: 'Article visible, descriptif initial généré par IA.',
        priceCdf: 900000,
        suggestedPriceMinCdf: 800000,
        title: 'Annonce préparée par IA',
      };
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal('priceCdf' in result.draftPatch, false);
  assert.equal('suggestedPriceMinCdf' in result.draftPatch, false);
});

test('ai service falls back to manual mode when the provider fails', async () => {
  const service = new AiService({
    async generateDraftFromImage() {
      throw new Error('provider timeout');
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
  });

  assert.equal(result.status, 'manual_fallback');
  assert.ok(result.message);
  assert.match(result.message, /manuellement/i);
});

test('ai service falls back to manual mode when the provider returns no title', async () => {
  const service = new AiService({
    async generateDraftFromImage() {
      return {
        categoryId: 'home_garden',
        condition: 'used_good',
        description: 'Gâteau visible sur la photo.',
        title: '',
      };
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-cake.jpg',
  });

  assert.equal(result.status, 'manual_fallback');
  assert.ok(result.message);
  assert.match(result.message, /manuellement/i);
});
