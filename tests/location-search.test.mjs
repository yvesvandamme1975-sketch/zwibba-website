import assert from 'node:assert/strict';
import test from 'node:test';

import { getMatchingLocationSuggestions } from '../App/utils/location-search.mjs';

test('location search prioritizes prefix matches and ignores accents and case', () => {
  const results = getMatchingLocationSuggestions('l', [
    'Lubumbashi',
    'Likasi',
    'Kolwezi',
  ]);

  assert.deepEqual(results, ['Lubumbashi', 'Likasi', 'Kolwezi']);
});

test('location search keeps major Congo cities ahead of user-suggested typos', () => {
  const results = getMatchingLocationSuggestions('l', [
    { label: 'Likasi', sourceType: 'system_seed' },
    { label: 'Lkasumbalesa', sourceType: 'user_suggested' },
    { label: 'Lubumbashi', sourceType: 'system_seed' },
    { label: 'Lubumbashi Centre', sourceType: 'user_suggested' },
  ]);

  assert.deepEqual(results, ['Lubumbashi', 'Likasi', 'Lubumbashi Centre', 'Lkasumbalesa']);
});

test('location search collapses accents and supports containment matches after prefixes', () => {
  const results = getMatchingLocationSuggestions('mayi', [
    'Kananga',
    'Mbuji-Mayi',
    'Kinshasa',
  ]);

  assert.deepEqual(results, ['Mbuji-Mayi']);
});
