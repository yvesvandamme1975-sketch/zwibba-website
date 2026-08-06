import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGeoCookie, resolveGeoCountry } from '../shared/geo-country.mjs';

test('resolveGeoCountry reads a valid cf-ipcountry header', () => {
  assert.equal(resolveGeoCountry({ 'cf-ipcountry': 'BE' }), 'BE');
  assert.equal(resolveGeoCountry({ 'cf-ipcountry': 'cd' }), 'CD');
});

test('resolveGeoCountry rejects missing or malformed values', () => {
  assert.equal(resolveGeoCountry({}), null);
  assert.equal(resolveGeoCountry({ 'cf-ipcountry': 'XX1' }), null);
  assert.equal(resolveGeoCountry({ 'cf-ipcountry': 'T1' }), null);
  assert.equal(resolveGeoCountry(undefined), null);
});

test('buildGeoCookie produces a readable functional cookie', () => {
  assert.equal(
    buildGeoCookie('BE'),
    'zwibba_geo=BE; Path=/; Max-Age=86400; SameSite=Lax',
  );
});
