import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatPricePreview,
  parsePriceInput,
} from '../App/utils/price-input.mjs';

test('parsePriceInput accepts plain digits and common grouped formats', () => {
  assert.equal(parsePriceInput('450000'), 450000);
  assert.equal(parsePriceInput('450 000'), 450000);
  assert.equal(parsePriceInput('450.000'), 450000);
  assert.equal(parsePriceInput('450,000'), 450000);
});

test('parsePriceInput returns null for empty or invalid values', () => {
  assert.equal(parsePriceInput(''), null);
  assert.equal(parsePriceInput('abc'), null);
  assert.equal(parsePriceInput(null), null);
});

test('formatPricePreview returns a formatted CDF helper for typed values', () => {
  assert.equal(formatPricePreview('450000'), '450 000 CDF');
  assert.equal(formatPricePreview('450 000'), '450 000 CDF');
  assert.equal(formatPricePreview(''), 'Entrez votre prix en CDF.');
});
