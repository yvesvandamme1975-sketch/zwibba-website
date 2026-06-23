import assert from 'node:assert/strict';
import test from 'node:test';

import { sellerMonogram } from '../App/utils/seller-monogram.mjs';

test('sellerMonogram returns up to two initials from a multi-word name', () => {
  assert.equal(sellerMonogram('Maison Kivu'), 'MK');
  assert.equal(sellerMonogram('Boutique Katanga Express'), 'BK');
});

test('sellerMonogram returns one initial for a one-word name', () => {
  assert.equal(sellerMonogram('Mavuno'), 'M');
});

test('sellerMonogram returns a stable neutral initial for empty input', () => {
  assert.equal(sellerMonogram(''), 'Z');
  assert.equal(sellerMonogram(null), 'Z');
  assert.equal(sellerMonogram(undefined), 'Z');
});
