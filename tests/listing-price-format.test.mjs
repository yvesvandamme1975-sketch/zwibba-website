import assert from 'node:assert/strict';
import test from 'node:test';

import { formatListingPrice } from '../App/utils/rendering.mjs';

test('formats EUR listing prices with euro suffix', () => {
  assert.equal(formatListingPrice({ priceAmount: 950, priceCurrency: 'EUR' }), '950 €');
  assert.equal(formatListingPrice({ priceAmount: 1250, priceCurrency: 'EUR' }), '1 250 €');
});

test('keeps existing app listing price formatting behaviour', () => {
  assert.match(formatListingPrice({ priceAmount: 25000, priceCurrency: 'CDF' }), /CDF$/);
  assert.match(formatListingPrice({ priceAmount: 40, priceCurrency: 'USD' }), /US\$$/);
  assert.equal(formatListingPrice({ priceAmount: 0, priceCurrency: 'EUR' }), 'À donner');
  assert.equal(formatListingPrice({ priceAmount: null, priceCurrency: 'EUR' }), '—');
});
