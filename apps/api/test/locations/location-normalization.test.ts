import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeLocationLabel } from '../../src/locations/location-normalization';

test('normalizeLocationLabel collapses accents, case, and extra spaces', () => {
  assert.equal(normalizeLocationLabel('  Kinshása  '), 'kinshasa');
});

test('normalizeLocationLabel keeps inner words separated by a single space', () => {
  assert.equal(normalizeLocationLabel('Mbuji   Mayi'), 'mbuji mayi');
});
