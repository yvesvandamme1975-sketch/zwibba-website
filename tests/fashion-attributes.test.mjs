import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getFashionItemTypeLabel,
  getFashionItemTypeOptions,
  getFashionSizeOptions,
  normalizeFashionItemType,
  normalizeFashionSize,
} from '../App/utils/fashion-attributes.mjs';

test('getFashionItemTypeOptions exposes the five jewelry subtypes with French labels', () => {
  const options = getFashionItemTypeOptions();
  const byValue = Object.fromEntries(options.map((option) => [option.value, option.label]));

  assert.equal(byValue.jewelry_ring, 'Bague');
  assert.equal(byValue.jewelry_earrings, "Boucles d'oreilles");
  assert.equal(byValue.jewelry_necklace, 'Collier');
  assert.equal(byValue.jewelry_bracelet, 'Bracelet');
  assert.equal(byValue.jewelry_watch, 'Montre');
});

test('getFashionItemTypeLabel maps each jewelry id to its French label', () => {
  assert.equal(getFashionItemTypeLabel('jewelry_ring'), 'Bague');
  assert.equal(getFashionItemTypeLabel('jewelry_earrings'), "Boucles d'oreilles");
});

test('getFashionSizeOptions returns ring sizes for jewelry_ring and an empty list otherwise', () => {
  assert.deepEqual(
    getFashionSizeOptions('jewelry_ring').map((option) => option.value),
    ['44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64', '66'],
  );
  assert.deepEqual(getFashionSizeOptions('jewelry_earrings'), []);
  assert.deepEqual(getFashionSizeOptions('jewelry_necklace'), []);
  assert.deepEqual(getFashionSizeOptions('jewelry_bracelet'), []);
  assert.deepEqual(getFashionSizeOptions('jewelry_watch'), []);
});

test('normalizeFashionItemType accepts the five jewelry subtypes', () => {
  assert.equal(normalizeFashionItemType('jewelry_ring'), 'jewelry_ring');
  assert.equal(normalizeFashionItemType('jewelry_earrings'), 'jewelry_earrings');
});

test('normalizeFashionSize returns empty for jewelry subtypes without a size grid', () => {
  for (const itemType of ['jewelry_earrings', 'jewelry_necklace', 'jewelry_bracelet', 'jewelry_watch']) {
    assert.equal(normalizeFashionSize(itemType, 'M'), '');
    assert.equal(normalizeFashionSize(itemType, '54'), '');
  }
});
