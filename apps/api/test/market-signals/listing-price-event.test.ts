import assert from 'node:assert/strict';
import test from 'node:test';

import { derivePriceEventInput } from '../../src/market-signals/listing-price-event';

test('derives the first price event for a new draft', () => {
  assert.deepEqual(
    derivePriceEventInput({
      countryCode: 'CD',
      draftId: 'draft-1',
      listingId: null,
      previous: null,
      next: { amount: 450_000, currency: 'CDF' },
      source: 'draft_created',
    }),
    {
      countryCode: 'CD',
      draftId: 'draft-1',
      listingId: null,
      previousAmount: null,
      previousCurrency: null,
      nextAmount: 450_000,
      nextCurrency: 'CDF',
      source: 'draft_created',
    },
  );
});

test('does not derive an event for an unchanged price', () => {
  assert.equal(
    derivePriceEventInput({
      countryCode: 'CD',
      draftId: 'draft-1',
      listingId: 'listing-1',
      previous: { amount: 450_000, currency: 'CDF' },
      next: { amount: 450_000, currency: 'CDF' },
      source: 'draft_sync',
    }),
    null,
  );
});

test('derives an event carrying both sides of an amount change', () => {
  const result = derivePriceEventInput({
    countryCode: 'CD',
    draftId: 'draft-1',
    listingId: 'listing-1',
    previous: { amount: 450_000, currency: 'CDF' },
    next: { amount: 425_000, currency: 'CDF' },
    source: 'draft_sync',
  });

  assert.equal(result?.previousAmount, 450_000);
  assert.equal(result?.previousCurrency, 'CDF');
  assert.equal(result?.nextAmount, 425_000);
  assert.equal(result?.nextCurrency, 'CDF');
  assert.equal(result?.source, 'draft_sync');
});

test('derives an event when only the currency changes', () => {
  const result = derivePriceEventInput({
    countryCode: 'CD',
    draftId: 'draft-1',
    listingId: 'listing-1',
    previous: { amount: 450_000, currency: 'CDF' },
    next: { amount: 450_000, currency: 'USD' },
    source: 'draft_sync',
  });

  assert.notEqual(result, null);
  assert.equal(result?.previousCurrency, 'CDF');
  assert.equal(result?.nextCurrency, 'USD');
});

test('normalizes the market country code', () => {
  const result = derivePriceEventInput({
    countryCode: 'be',
    draftId: 'draft-1',
    listingId: null,
    previous: null,
    next: { amount: 30, currency: 'EUR' },
    source: 'draft_created',
  });

  assert.equal(result?.countryCode, 'BE');
});
