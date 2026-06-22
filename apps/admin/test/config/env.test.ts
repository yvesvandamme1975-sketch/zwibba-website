import assert from 'node:assert/strict';
import test from 'node:test';

import { loadAdminEnv } from '../../src/config/env';

test('throws in production when the admin secret is missing', () => {
  assert.throws(
    () => loadAdminEnv({ RAILWAY_ENVIRONMENT: 'production', ZWIBBA_API_BASE_URL: 'https://api.example' }),
    /Missing required admin env value/,
  );
});

test('rejects the insecure default admin secret in production', () => {
  assert.throws(
    () =>
      loadAdminEnv({
        RAILWAY_ENVIRONMENT: 'production',
        ZWIBBA_API_BASE_URL: 'https://api.example',
        ZWIBBA_ADMIN_SHARED_SECRET: 'zwibba-admin-secret',
      }),
    /insecure default/,
  );
});

test('accepts a real admin secret in production', () => {
  const env = loadAdminEnv({
    RAILWAY_ENVIRONMENT: 'production',
    ZWIBBA_API_BASE_URL: 'https://api.example',
    ZWIBBA_ADMIN_SHARED_SECRET: 'a-real-strong-secret',
  });
  assert.equal(env.sharedSecret, 'a-real-strong-secret');
});

test('keeps the convenience default outside production', () => {
  const env = loadAdminEnv({ ZWIBBA_API_BASE_URL: 'http://127.0.0.1:3200' });
  assert.equal(env.sharedSecret, 'zwibba-admin-secret');
});
