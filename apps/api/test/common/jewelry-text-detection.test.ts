import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectJewelryItemTypeFromText,
} from '../../src/common/jewelry-text-detection';

test('detectJewelryItemTypeFromText returns jewelry_ring for bague variants', () => {
  assert.equal(detectJewelryItemTypeFromText('Bague en or blanc losanges'), 'jewelry_ring');
  assert.equal(detectJewelryItemTypeFromText('belle bague vintage'), 'jewelry_ring');
  assert.equal(detectJewelryItemTypeFromText('Alliance or 18 carats'), 'jewelry_ring');
});

test('detectJewelryItemTypeFromText returns jewelry_earrings for boucles d oreilles variants', () => {
  assert.equal(
    detectJewelryItemTypeFromText("Boucles d'oreilles fantaisie à strass"),
    'jewelry_earrings',
  );
  assert.equal(
    detectJewelryItemTypeFromText("Boucles d’oreilles dorées"),
    'jewelry_earrings',
  );
  assert.equal(
    detectJewelryItemTypeFromText('Puces d oreilles argent'),
    'jewelry_earrings',
  );
});

test('detectJewelryItemTypeFromText returns jewelry_necklace for collier variants', () => {
  assert.equal(detectJewelryItemTypeFromText('Collier en perles'), 'jewelry_necklace');
  assert.equal(detectJewelryItemTypeFromText('Pendentif coeur or'), 'jewelry_necklace');
  assert.equal(detectJewelryItemTypeFromText('Chaîne argent maille jaseron'), 'jewelry_necklace');
});

test('detectJewelryItemTypeFromText returns jewelry_bracelet for bracelet variants', () => {
  assert.equal(detectJewelryItemTypeFromText('Bracelet jonc martelé'), 'jewelry_bracelet');
  assert.equal(detectJewelryItemTypeFromText('Gourmette argent'), 'jewelry_bracelet');
});

test('detectJewelryItemTypeFromText returns jewelry_watch for montre variants', () => {
  assert.equal(detectJewelryItemTypeFromText('Montre quartz vintage'), 'jewelry_watch');
});

test('detectJewelryItemTypeFromText returns null when nothing matches', () => {
  assert.equal(detectJewelryItemTypeFromText('Robe d été à fleurs'), null);
  assert.equal(detectJewelryItemTypeFromText('T-shirt coton bio'), null);
  assert.equal(detectJewelryItemTypeFromText(''), null);
});

test('detectJewelryItemTypeFromText returns null when the text is ambiguous', () => {
  assert.equal(
    detectJewelryItemTypeFromText('Parure bague et collier assortis'),
    null,
  );
});

import { proposeJewelryBackfillForRecord } from '../../src/common/jewelry-text-detection';

test('proposeJewelryBackfillForRecord returns null for non-fashion records', () => {
  assert.equal(
    proposeJewelryBackfillForRecord({
      categoryId: 'electronics',
      attributesJson: { fashion: { itemType: 'tops', size: 'M' } },
      title: 'Bague vintage',
      description: '',
    }),
    null,
  );
});

test('proposeJewelryBackfillForRecord returns null when itemType is already jewelry', () => {
  assert.equal(
    proposeJewelryBackfillForRecord({
      categoryId: 'fashion',
      attributesJson: { fashion: { itemType: 'jewelry_ring', size: '54' } },
      title: 'Bague or blanc',
      description: '',
    }),
    null,
  );
});

test('proposeJewelryBackfillForRecord proposes jewelry_ring on a misclassified bague', () => {
  const result = proposeJewelryBackfillForRecord({
    categoryId: 'fashion',
    attributesJson: { fashion: { itemType: 'dress_skirt', size: 'M' } },
    title: 'Bague en or blanc avec motif losanges',
    description: 'Bague unique, jamais portée',
  });

  assert.deepEqual(result, {
    from: { itemType: 'dress_skirt', size: 'M' },
    to: { itemType: 'jewelry_ring', size: '' },
    evidence: 'bague',
  });
});

test('proposeJewelryBackfillForRecord returns null when text is ambiguous', () => {
  assert.equal(
    proposeJewelryBackfillForRecord({
      categoryId: 'fashion',
      attributesJson: { fashion: { itemType: 'tops', size: 'M' } },
      title: 'Parure bague collier',
      description: 'Pendentif assorti',
    }),
    null,
  );
});
