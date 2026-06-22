import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SESSION_TTL_MS,
  computeSessionExpiry,
  isSessionExpired,
} from '../../src/auth/session-expiry';

test('computeSessionExpiry returns now plus the TTL', () => {
  const now = new Date('2026-06-22T00:00:00.000Z');
  assert.equal(computeSessionExpiry(now).getTime(), now.getTime() + SESSION_TTL_MS);
});

test('isSessionExpired is false when expiresAt is null', () => {
  assert.equal(isSessionExpired({ expiresAt: null }), false);
});

test('isSessionExpired is true once past expiresAt', () => {
  const now = new Date('2026-06-22T00:00:00.000Z');
  assert.equal(isSessionExpired({ expiresAt: new Date(now.getTime() - 1000) }, now), true);
});

test('isSessionExpired is false before expiresAt', () => {
  const now = new Date('2026-06-22T00:00:00.000Z');
  assert.equal(isSessionExpired({ expiresAt: new Date(now.getTime() + 1000) }, now), false);
});
