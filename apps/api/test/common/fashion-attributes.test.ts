import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeFashionItemType,
  normalizeFashionSize,
} from '../../src/common/fashion-attributes';

test('normalizeFashionItemType accepts the five jewelry subtypes', () => {
  assert.equal(normalizeFashionItemType('jewelry_ring'), 'jewelry_ring');
  assert.equal(normalizeFashionItemType('jewelry_earrings'), 'jewelry_earrings');
  assert.equal(normalizeFashionItemType('jewelry_necklace'), 'jewelry_necklace');
  assert.equal(normalizeFashionItemType('jewelry_bracelet'), 'jewelry_bracelet');
  assert.equal(normalizeFashionItemType('jewelry_watch'), 'jewelry_watch');
});

test('normalizeFashionSize accepts EU ring sizes for jewelry_ring', () => {
  assert.equal(normalizeFashionSize('jewelry_ring', '54'), '54');
  assert.equal(normalizeFashionSize('jewelry_ring', '44'), '44');
  assert.equal(normalizeFashionSize('jewelry_ring', '66'), '66');
});

test('normalizeFashionSize rejects out-of-grid ring sizes', () => {
  assert.equal(normalizeFashionSize('jewelry_ring', '45'), '');
  assert.equal(normalizeFashionSize('jewelry_ring', 'M'), '');
  assert.equal(normalizeFashionSize('jewelry_ring', '70'), '');
});

test('normalizeFashionSize returns empty for jewelry subtypes without a size grid', () => {
  for (const itemType of ['jewelry_earrings', 'jewelry_necklace', 'jewelry_bracelet', 'jewelry_watch']) {
    assert.equal(normalizeFashionSize(itemType, 'M'), '');
    assert.equal(normalizeFashionSize(itemType, '54'), '');
    assert.equal(normalizeFashionSize(itemType, ''), '');
  }
});
