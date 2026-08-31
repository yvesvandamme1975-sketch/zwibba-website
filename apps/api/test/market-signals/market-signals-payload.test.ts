import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSearchQueryEventInput,
  normalizeSearchQuery,
} from '../../src/market-signals/market-signals-payload';

test('normalizes a search query', () => {
  assert.equal(normalizeSearchQuery('  Ciment   SIMBA '), 'ciment simba');
});

test('rejects a whitespace-only search query', () => {
  assert.equal(
    buildSearchQueryEventInput({
      countryCode: 'CD',
      rawQuery: '   ',
      resultCount: 4,
      selectedCategoryId: '',
    }),
    null,
  );
});

test('builds a search event while preserving raw casing and a zero result count', () => {
  assert.deepEqual(
    buildSearchQueryEventInput({
      countryCode: 'CD',
      rawQuery: 'Ciment SIMBA',
      resultCount: 0,
      selectedCategoryId: 'construction',
    }),
    {
      countryCode: 'CD',
      normalizedQuery: 'ciment simba',
      rawQuery: 'Ciment SIMBA',
      resultCount: 0,
      selectedCategoryId: 'construction',
    },
  );
});

test('normalizes a lowercase market country code', () => {
  const result = buildSearchQueryEventInput({
    countryCode: 'be',
    rawQuery: 'vélo',
    resultCount: 3,
    selectedCategoryId: '',
  });

  assert.equal(result?.countryCode, 'BE');
});

test('truncates the raw query to 120 characters', () => {
  const result = buildSearchQueryEventInput({
    countryCode: 'CD',
    rawQuery: 'A'.repeat(121),
    resultCount: 1,
    selectedCategoryId: '',
  });

  assert.equal(result?.rawQuery.length, 120);
});

test('rejects invalid result counts', () => {
  for (const resultCount of [-1, 1.5, Number.NaN]) {
    assert.equal(
      buildSearchQueryEventInput({
        countryCode: 'CD',
        rawQuery: 'ciment',
        resultCount,
        selectedCategoryId: '',
      }),
      null,
    );
  }
});
