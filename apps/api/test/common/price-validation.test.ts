import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatListingPrice,
  listingCurrenciesForCountry,
  normalizeListingPriceCurrency,
  resolveSubmittedListingPrice,
} from '../../src/common/price-validation';

test('normalizeListingPriceCurrency accepts EUR', () => {
  assert.equal(normalizeListingPriceCurrency('EUR'), 'EUR');
});

test('formatListingPrice renders EUR with the euro suffix', () => {
  assert.equal(
    formatListingPrice({ priceAmount: 250, priceCurrency: 'EUR' }),
    '250 €',
  );
});

test('listingCurrenciesForCountry scopes currencies per market', () => {
  assert.deepEqual(listingCurrenciesForCountry('CD'), ['CDF', 'USD']);
  assert.deepEqual(listingCurrenciesForCountry('BE'), ['EUR']);
});

test('resolveSubmittedListingPrice keeps EUR when a legacy priceCdf is also present', () => {
  assert.deepEqual(
    resolveSubmittedListingPrice({
      priceAmount: 250,
      priceCurrency: 'EUR',
      priceCdf: 250,
    }),
    { legacyPriceCdf: 250, priceAmount: 250, priceCurrency: 'EUR' },
  );
});
