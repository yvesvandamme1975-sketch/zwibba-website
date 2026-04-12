import assert from 'node:assert/strict';
import test from 'node:test';

import { getMatchingLocationSuggestions } from '../App/utils/location-search.mjs';

test('location search prioritizes prefix matches and ignores accents and case', () => {
  const results = getMatchingLocationSuggestions('l', [
    'Lubumbashi',
    'Likasi',
    'Kolwezi',
  ]);

  assert.deepEqual(results, ['Likasi', 'Lubumbashi', 'Kolwezi']);
});

test('location search collapses accents and supports containment matches after prefixes', () => {
  const results = getMatchingLocationSuggestions('mayi', [
    'Kananga',
    'Mbuji-Mayi',
    'Kinshasa',
  ]);

  assert.deepEqual(results, ['Mbuji-Mayi']);
});
