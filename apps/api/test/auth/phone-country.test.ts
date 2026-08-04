import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeMarketCountryCode,
  resolvePhoneCountry,
} from '../../src/auth/phone-country';

test('resolvePhoneCountry maps +243 numbers to CD', () => {
  assert.equal(resolvePhoneCountry('+243990000001'), 'CD');
});

test('resolvePhoneCountry maps +32 numbers to BE', () => {
  assert.equal(resolvePhoneCountry(' +32499000001 '), 'BE');
});

test('resolvePhoneCountry rejects other prefixes', () => {
  assert.equal(resolvePhoneCountry('+33612345678'), null);
  assert.equal(resolvePhoneCountry('0499000001'), null);
});

test('normalizeMarketCountryCode falls back to CD', () => {
  assert.equal(normalizeMarketCountryCode('BE'), 'BE');
  assert.equal(normalizeMarketCountryCode('be'), 'CD');
  assert.equal(normalizeMarketCountryCode(undefined), 'CD');
});
