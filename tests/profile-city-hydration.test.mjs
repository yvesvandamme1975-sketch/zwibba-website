import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveProfileCityHydration } from '../App/utils/profile-city-hydration.mjs';

test('profile city hydration keeps user typing that happened while the profile was loading', () => {
  const result = resolveProfileCityHydration({
    currentInput: 'L',
    currentSelectedArea: '',
    inputAtLoadStart: '',
    profileArea: 'Lubumbashi Centre',
  });

  assert.deepEqual(result, {
    inputValue: 'L',
    selectedArea: '',
  });
});
