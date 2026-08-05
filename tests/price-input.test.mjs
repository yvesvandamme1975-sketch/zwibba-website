import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatPricePreview,
  listingCurrenciesForCountry,
  normalizePriceCurrency,
  parsePriceInput,
} from '../App/utils/price-input.mjs';

test('parsePriceInput accepts plain digits and common grouped formats', () => {
  assert.equal(parsePriceInput('0'), 0);
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
  assert.equal(formatPricePreview('0', 'CDF'), 'À donner');
  assert.equal(formatPricePreview('450000', 'CDF'), '450 000 CDF');
  assert.equal(formatPricePreview('450 000', 'CDF'), '450 000 CDF');
  assert.equal(formatPricePreview('', 'CDF'), 'Entrez votre prix en CDF.');
});

test('formatPricePreview switches helper copy and formatting for USD', () => {
  assert.equal(formatPricePreview('0', 'USD'), 'À donner');
  assert.equal(formatPricePreview('350', 'USD'), '350 US$');
  assert.equal(formatPricePreview('', 'USD'), 'Entrez votre prix en US$.');
});

test('normalizePriceCurrency accepts EUR for Belgian sessions', () => {
  assert.equal(normalizePriceCurrency('EUR'), 'EUR');
  assert.equal(normalizePriceCurrency('CDF'), 'CDF');
  assert.equal(normalizePriceCurrency('USD'), 'USD');
  assert.equal(normalizePriceCurrency('XOF'), '');
});

test('listingCurrenciesForCountry mirrors the API market rule', () => {
  assert.deepEqual(listingCurrenciesForCountry('BE'), ['EUR']);
  assert.deepEqual(listingCurrenciesForCountry('CD'), ['CDF', 'USD']);
  assert.deepEqual(listingCurrenciesForCountry(undefined), ['CDF', 'USD']);
});

test('formatPricePreview switches helper copy and formatting for EUR', () => {
  assert.equal(formatPricePreview('0', 'EUR'), 'À donner');
  assert.equal(formatPricePreview('250', 'EUR'), '250 €');
  assert.equal(formatPricePreview('', 'EUR'), 'Entrez votre prix en €.');
});
