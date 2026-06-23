import assert from 'node:assert/strict';
import test from 'node:test';

import {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
} from '../../src/auth/otp-code';

test('generateOtpCode returns a 6-digit numeric string', () => {
  const code = generateOtpCode();

  assert.match(code, /^\d{6}$/);
});

test('hashOtpCode returns a non-empty hash that is not the plaintext code', () => {
  const code = '123456';
  const hash = hashOtpCode(code);

  assert.notEqual(hash, '');
  assert.notEqual(hash, code);
});

test('verifyOtpCode accepts the matching code and hash', () => {
  const code = '123456';

  assert.equal(verifyOtpCode(code, hashOtpCode(code)), true);
});

test('verifyOtpCode rejects a different code', () => {
  assert.equal(verifyOtpCode('000000', hashOtpCode('123456')), false);
});
