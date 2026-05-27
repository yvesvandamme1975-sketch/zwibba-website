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
