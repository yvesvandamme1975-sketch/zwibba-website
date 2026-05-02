import assert from 'node:assert/strict';
import test from 'node:test';

import { fuseGoogleVisionSignalsIntoDraft } from '../../src/ai/google-hybrid-draft-fusion';

test('google hybrid fusion refines a generic services title from OCR', () => {
  const result = fuseGoogleVisionSignalsIntoDraft({
    draftPatch: {
      categoryId: 'services',
      condition: 'used_good',
      description: 'Logo et coordonnées d’un service visible.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Plumbing service'],
      logos: ['Zwibba Pro'],
      objects: ['Document'],
      ocrText: 'ZWIBBA PRO\nPlomberie 7j/7\n+243 000 000 000',
    },
  });

  assert.equal(result.categoryId, 'services');
  assert.equal(result.title, 'ZWIBBA PRO');
});

test('google hybrid fusion can promote electronics fallback to emploi on strong OCR evidence', () => {
  const result = fuseGoogleVisionSignalsIntoDraft({
    draftPatch: {
      categoryId: 'electronics',
      condition: 'used_good',
      description: 'Visuel d’entreprise pour une offre d’emploi.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Job posting'],
      logos: [],
      objects: ['Poster'],
      ocrText: 'Recrutement commercial\nLubumbashi',
    },
  });

  assert.equal(result.categoryId, 'emploi');
  assert.equal(result.title, 'Recrutement commercial');
});

test('google hybrid fusion does not override categories outside the enrichment rollout', () => {
  const result = fuseGoogleVisionSignalsIntoDraft({
    draftPatch: {
      categoryId: 'electronics',
      condition: 'used_good',
      description: 'Article visible, descriptif initial généré par IA.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Laptop'],
      logos: ['Samsung'],
      objects: ['Computer'],
      ocrText: 'Samsung Galaxy Book',
    },
  });

  assert.equal(result.categoryId, 'electronics');
  assert.equal(result.title, 'Annonce préparée par IA');
});

test('google hybrid fusion can infer fashion item type and size from OCR-heavy label text', () => {
  const result = fuseGoogleVisionSignalsIntoDraft({
    draftPatch: {
      categoryId: 'fashion',
      condition: 'like_new',
      description: 'Chaussures visibles sur la photo.',
      title: 'Annonce préparée par IA',
    },
    signals: {
      labels: ['Sneakers'],
      logos: ['Nike'],
      objects: ['Shoe'],
      ocrText: 'NIKE\nCHAUSSURES\nEU 39',
    },
  });

  assert.equal(result.categoryId, 'fashion');
  assert.equal(result.itemType, 'shoes');
  assert.equal(result.size, '39');
});
