import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePhoneCountry } from '../App/utils/phone-country.mjs';

test('maps +243 to CD, +32 to BE, defaults to CD', () => {
  assert.equal(resolvePhoneCountry('+243990000001'), 'CD');
  assert.equal(resolvePhoneCountry('+32499000001'), 'BE');
  assert.equal(resolvePhoneCountry(undefined), 'CD');
});
