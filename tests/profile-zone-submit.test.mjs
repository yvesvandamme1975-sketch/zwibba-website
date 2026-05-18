import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveProfileAreaForSubmit } from '../App/utils/profile-zone-submit.mjs';

test('profile zone submit accepts an exact typed city when the hidden selection is still empty', () => {
  const area = resolveProfileAreaForSubmit({
    area: '',
    areaSearch: 'Lubumbashi Centre',
    cityOptions: [
      { label: 'Lubumbashi' },
      { label: 'Lubumbashi Centre' },
    ],
    selectedArea: '',
  });

  assert.equal(area, 'Lubumbashi Centre');
});
