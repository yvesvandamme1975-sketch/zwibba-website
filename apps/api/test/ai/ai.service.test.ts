import assert from 'node:assert/strict';
import test from 'node:test';

import { AiService } from '../../src/ai/ai.service';
import { buildVisionDraftPrompt } from '../../src/ai/vision-provider-prompt';

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

test('ai service accepts services as a supported category', async () => {
  const service = new AiService({
    async generateDraftFromImage() {
      return {
        categoryId: 'services',
        condition: 'used_good',
        description: 'Logo et coordonnées d’un service visible.',
        title: 'Service de plomberie à domicile',
      };
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-service.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.categoryId, 'services');
});

test('ai service accepts emploi as a supported category', async () => {
  const service = new AiService({
    async generateDraftFromImage() {
      return {
        categoryId: 'emploi',
        condition: 'used_good',
        description: 'Visuel d’entreprise pour une offre d’emploi.',
        title: 'Recrutement commercial Lubumbashi',
      };
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-emploi.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.categoryId, 'emploi');
});

test('ai service accepts the expanded supported categories', async () => {
  const supportedCategories = [
    'food',
    'agriculture',
    'construction',
    'education',
    'music',
    'health',
    'beauty',
    'sports_leisure',
  ];

  for (const categoryId of supportedCategories) {
    const service = new AiService({
      async generateDraftFromImage() {
        return {
          categoryId,
          condition: 'used_good',
          description: `Annonce ${categoryId} visible sur la photo.`,
          title: `Annonce ${categoryId}`,
        };
      },
    });

    const result = await service.generateDraft({
      photoUrl: `https://pub.example.test/draft-photos/capture/photo_1-${categoryId}.jpg`,
    });

    assert.equal(result.status, 'ready');
    assert.ok(result.draftPatch);
    assert.equal(result.draftPatch.categoryId, categoryId);
  }
});

test('ai service keeps optional fashion item type and size when they are valid', async () => {
  const service = new AiService({
    async generateDraftFromImage() {
      return {
        categoryId: 'fashion',
        condition: 'like_new',
        description: 'Baskets blanches avec étiquette visible.',
        itemType: 'shoes',
        size: '39',
        title: 'Baskets Nike blanches',
      };
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-fashion.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.itemType, 'shoes');
  assert.equal(result.draftPatch.size, '39');
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

test('ai service strips background context from a product description', async () => {
  const service = new AiService({
    async generateDraftFromImage() {
      return {
        categoryId: 'electronics',
        condition: 'like_new',
        description:
          'Ordinateur portable argenté avec clavier gris clair et pavé tactile gris foncé, posé sur une table en bois.',
        title: 'Ordinateur portable argenté',
      };
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-laptop.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(
    result.draftPatch.description,
    'Ordinateur portable argenté avec clavier gris clair et pavé tactile gris foncé.',
  );
});

test('ai service enriches a generic seller draft with Google Vision signals when enabled', async () => {
  const service = new AiService({
    googleVisionEnrichmentProvider: {
      async collectSignalsFromImage() {
        return {
          labels: ['Job posting'],
          logos: [],
          objects: ['Poster'],
          ocrText: 'Recrutement commercial\nLubumbashi',
        };
      },
    },
    visionDraftProvider: {
      async generateDraftFromImage() {
        return {
          categoryId: 'electronics',
          condition: 'used_good',
          description: 'Visuel d’entreprise pour une offre d’emploi.',
          title: 'Annonce préparée par IA',
        };
      },
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-emploi.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.categoryId, 'emploi');
  assert.equal(result.draftPatch.title, 'Recrutement commercial');
});

test('ai service promotes a generic electronics draft to services on strong business-card evidence', async () => {
  const service = new AiService({
    googleVisionEnrichmentProvider: {
      async collectSignalsFromImage() {
        return {
          labels: ['Business card'],
          logos: ['Zwibba Pro'],
          objects: ['Document'],
          ocrText: 'ZWIBBA PRO\nPlomberie 7j/7\n+243 000 000 000',
        };
      },
    },
    visionDraftProvider: {
      async generateDraftFromImage() {
        return {
          categoryId: 'electronics',
          condition: 'used_good',
          description: 'Carte visible sur la photo.',
          title: 'Annonce préparée par IA',
        };
      },
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-service-card.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.categoryId, 'services');
});

test('ai service keeps electronics for generic audio gear with weak music evidence', async () => {
  const service = new AiService({
    googleVisionEnrichmentProvider: {
      async collectSignalsFromImage() {
        return {
          labels: ['Speaker', 'Electronics'],
          logos: [],
          objects: ['Speaker'],
          ocrText: 'Bluetooth speaker',
        };
      },
    },
    visionDraftProvider: {
      async generateDraftFromImage() {
        return {
          categoryId: 'electronics',
          condition: 'used_good',
          description: 'Appareil audio visible.',
          title: 'Annonce préparée par IA',
        };
      },
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-speaker.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.categoryId, 'electronics');
});

test('ai service promotes a clear instrument to music on strong evidence', async () => {
  const service = new AiService({
    googleVisionEnrichmentProvider: {
      async collectSignalsFromImage() {
        return {
          labels: ['Keyboard instrument'],
          logos: ['Yamaha'],
          objects: ['Musical keyboard'],
          ocrText: 'Yamaha clavier musical',
        };
      },
    },
    visionDraftProvider: {
      async generateDraftFromImage() {
        return {
          categoryId: 'electronics',
          condition: 'used_good',
          description: 'Instrument visible.',
          title: 'Annonce préparée par IA',
        };
      },
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-keyboard.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.categoryId, 'music');
});

test('ai service promotes clear beauty evidence to beauty on strong signals', async () => {
  const service = new AiService({
    googleVisionEnrichmentProvider: {
      async collectSignalsFromImage() {
        return {
          labels: ['Beauty product'],
          logos: [],
          objects: ['Cosmetic bottle'],
          ocrText: 'Fond de teint mat longue tenue',
        };
      },
    },
    visionDraftProvider: {
      async generateDraftFromImage() {
        return {
          categoryId: 'electronics',
          condition: 'new_item',
          description: 'Produit visible.',
          title: 'Annonce préparée par IA',
        };
      },
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-foundation.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.categoryId, 'beauty');
});

test('ai service keeps a safe generic category for ambiguous cream signals', async () => {
  const service = new AiService({
    googleVisionEnrichmentProvider: {
      async collectSignalsFromImage() {
        return {
          labels: ['Jar'],
          logos: [],
          objects: ['Jar'],
          ocrText: 'Creme hydratante',
        };
      },
    },
    visionDraftProvider: {
      async generateDraftFromImage() {
        return {
          categoryId: 'electronics',
          condition: 'used_good',
          description: 'Produit visible.',
          title: 'Annonce préparée par IA',
        };
      },
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-cream.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.categoryId, 'electronics');
});

test('ai service can still disambiguate education from strong Gemini text without Google Vision signals', async () => {
  const service = new AiService({
    async generateDraftFromImage() {
      return {
        categoryId: 'electronics',
        condition: 'new_item',
        description: 'Ensemble de papeterie avec calculatrice.',
        title: 'Calculatrice et papeterie',
      };
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-education.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.categoryId, 'education');
});

test('ai service can still disambiguate services from strong Gemini text without Google Vision signals', async () => {
  const service = new AiService({
    async generateDraftFromImage() {
      return {
        categoryId: 'fashion',
        condition: 'used_good',
        description: 'Allen wrench for plumbing repair.',
        title: 'Plumbing repair service tool',
      };
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-service.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.categoryId, 'services');
});

test('ai service keeps the Gemini draft when Google Vision enrichment fails', async () => {
  const service = new AiService({
    googleVisionEnrichmentProvider: {
      async collectSignalsFromImage() {
        throw new Error('vision timeout');
      },
    },
    visionDraftProvider: {
      async generateDraftFromImage() {
        return {
          categoryId: 'electronics',
          condition: 'used_good',
          description: 'Ordinateur portable argenté avec clavier gris clair.',
          title: 'Ordinateur portable argenté',
        };
      },
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-laptop.jpg',
  });

  assert.equal(result.status, 'ready');
  assert.ok(result.draftPatch);
  assert.equal(result.draftPatch.categoryId, 'electronics');
  assert.equal(result.draftPatch.title, 'Ordinateur portable argenté');
});

test('ai service still falls back to manual mode when the primary provider fails even if Google Vision succeeds', async () => {
  const service = new AiService({
    googleVisionEnrichmentProvider: {
      async collectSignalsFromImage() {
        return {
          labels: ['Plumbing service'],
          logos: ['Zwibba Pro'],
          objects: ['Document'],
          ocrText: 'ZWIBBA PRO\nPlomberie 7j/7',
        };
      },
    },
    visionDraftProvider: {
      async generateDraftFromImage() {
        throw new Error('gemini timeout');
      },
    },
  });

  const result = await service.generateDraft({
    photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-service.jpg',
  });

  assert.equal(result.status, 'manual_fallback');
  assert.ok(result.message);
});

test('vision prompt tells the provider to ignore background context', () => {
  const prompt = buildVisionDraftPrompt();

  assert.match(prompt, /ignore/i);
  assert.match(prompt, /arrière-plan|décor|environnement/i);
});

test('vision prompt tells the provider to stay conservative between close categories', () => {
  const prompt = buildVisionDraftPrompt();

  assert.match(prompt, /n'utilise pas emploi sans/i);
  assert.match(prompt, /n'utilise pas music pour un simple appareil audio/i);
  assert.match(prompt, /préfère une catégorie plus large et sûre/i);
});
