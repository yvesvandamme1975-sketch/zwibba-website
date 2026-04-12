import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSystemSeededCities } from '../../src/locations/system-seeded-cities';

test('system seeded cities include Lubumbashi and Kinshasa for CD', () => {
  const definitions = buildSystemSeededCities();

  assert.ok(definitions.some((city) => city.countryCode === 'CD' && city.label === 'Lubumbashi'));
  assert.ok(definitions.some((city) => city.countryCode === 'CD' && city.label === 'Kinshasa'));
});

test('system seeded cities are active Congo city rows marked as system seeds', () => {
  const definitions = buildSystemSeededCities();

  assert.ok(definitions.length >= 15);

  for (const definition of definitions) {
    assert.equal(definition.countryCode, 'CD');
    assert.equal(definition.type, 'city');
    assert.equal(definition.status, 'active');
    assert.equal(definition.sourceType, 'system_seed');
  }
});
