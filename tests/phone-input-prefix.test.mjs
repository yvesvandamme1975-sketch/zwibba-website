import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderPhoneInputScreen,
  resolveDefaultPhonePrefix,
} from '../App/features/auth/phone-input-screen.mjs';

test('resolveDefaultPhonePrefix returns +32 for the belgian market', () => {
  assert.equal(resolveDefaultPhonePrefix('BE'), '+32');
});

test('resolveDefaultPhonePrefix returns +243 for the congolese market', () => {
  assert.equal(resolveDefaultPhonePrefix('CD'), '+243');
});

test('resolveDefaultPhonePrefix falls back to +243 for unknown markets', () => {
  assert.equal(resolveDefaultPhonePrefix(undefined), '+243');
  assert.equal(resolveDefaultPhonePrefix('FR'), '+243');
});

test('renderPhoneInputScreen renders the provided phone number', () => {
  const html = renderPhoneInputScreen({ phoneNumber: '+32' });

  assert.match(html, /value="\+32"/);
});
