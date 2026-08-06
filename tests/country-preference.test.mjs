import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCountryPreference,
  readGeoCountry,
} from '../App/services/country-preference.mjs';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('stores and normalizes the browse country', () => {
  const preference = createCountryPreference({ storage: createMemoryStorage() });
  assert.equal(preference.getStoredCountry(), null);
  preference.setStoredCountry('BE');
  assert.equal(preference.getStoredCountry(), 'BE');
  preference.setStoredCountry('FR');
  assert.equal(preference.getStoredCountry(), 'BE');
});

test('readGeoCountry extracts zwibba_geo from a cookie string', () => {
  assert.equal(readGeoCountry('foo=1; zwibba_geo=BE; bar=2'), 'BE');
  assert.equal(readGeoCountry('zwibba_geo=CD'), 'CD');
  assert.equal(readGeoCountry('foo=1'), null);
  assert.equal(readGeoCountry(undefined), null);
});
