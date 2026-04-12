import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveProfileCityAutocompleteState } from '../App/utils/profile-city-autocomplete-state.mjs';

test('deriveProfileCityAutocompleteState auto-selects an exact city match', () => {
  const result = deriveProfileCityAutocompleteState({
    cityOptions: [{ label: 'Likasi' }, { label: 'Lubumbashi' }],
    inputValue: 'lubumbashi',
    selectedArea: '',
  });

  assert.equal(result.selectedArea, 'Lubumbashi');
  assert.equal(result.missingCityLabel, '');
  assert.deepEqual(result.suggestions, ['Lubumbashi']);
});

test('deriveProfileCityAutocompleteState exposes a missing-city action only when no suggestion remains', () => {
  const result = deriveProfileCityAutocompleteState({
    cityOptions: [{ label: 'Likasi' }, { label: 'Lubumbashi' }],
    inputValue: 'Kasumbalesa',
    selectedArea: '',
  });

  assert.equal(result.selectedArea, '');
  assert.equal(result.missingCityLabel, 'Kasumbalesa');
  assert.deepEqual(result.suggestions, []);
});
