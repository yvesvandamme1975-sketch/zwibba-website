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

test('profile zone submit ignores a stale hidden area when the typed city changed', () => {
  const area = resolveProfileAreaForSubmit({
    area: 'Lubumbashi Centre',
    areaSearch: 'Likasi',
    cityOptions: [
      { label: 'Likasi' },
      { label: 'Lubumbashi Centre' },
    ],
    selectedArea: 'Lubumbashi Centre',
  });

  assert.equal(area, 'Likasi');
});
