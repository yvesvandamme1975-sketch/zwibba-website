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
  const cdDefinitions = definitions.filter((city) => city.countryCode === 'CD');

  assert.ok(cdDefinitions.length >= 15);

  for (const definition of cdDefinitions) {
    assert.equal(definition.countryCode, 'CD');
    assert.equal(definition.type, 'city');
    assert.equal(definition.status, 'active');
    assert.equal(definition.sourceType, 'system_seed');
  }
});

test('system seeded cities include Bruxelles for BE alongside the CD cities', () => {
  const definitions = buildSystemSeededCities();

  const bruxelles = definitions.find(
    (city) => city.countryCode === 'BE' && city.label === 'Bruxelles',
  );

  assert.ok(bruxelles, 'expected a Bruxelles entry scoped to BE');
  assert.equal(bruxelles?.sourceType, 'system_seed');
  assert.equal(bruxelles?.status, 'active');
  assert.equal(bruxelles?.type, 'city');
  assert.equal(bruxelles?.normalizedLabel, 'bruxelles');

  const cdDefinitions = definitions.filter((city) => city.countryCode === 'CD');
  assert.ok(cdDefinitions.length >= 15, 'CD cities must still be present');
});

test('system seeded cities include all 15 Belgian cities', () => {
  const definitions = buildSystemSeededCities();
  const beDefinitions = definitions.filter((city) => city.countryCode === 'BE');

  assert.equal(beDefinitions.length, 15);

  for (const definition of beDefinitions) {
    assert.equal(definition.countryCode, 'BE');
    assert.equal(definition.type, 'city');
    assert.equal(definition.status, 'active');
    assert.equal(definition.sourceType, 'system_seed');
  }
});
