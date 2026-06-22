import assert from \x27node:assert/strict\x27;
import test from \x27node:test\x27;

import { loadAdminEnv } from \x27../../src/config/env\x27;

test(\x27throws in production when the admin secret is missing\x27, () => {
  assert.throws(
    () => loadAdminEnv({ RAILWAY_ENVIRONMENT: \x27production\x27, ZWIBBA_API_BASE_URL: \x27https://api.example\x27 }),
    /Missing required admin env value/,
  );
});

test(\x27rejects the insecure default admin secret in production\x27, () => {
  assert.throws(
    () =>
      loadAdminEnv({
        RAILWAY_ENVIRONMENT: \x27production\x27,
        ZWIBBA_API_BASE_URL: \x27https://api.example\x27,
        ZWIBBA_ADMIN_SHARED_SECRET: \x27zwibba-admin-secret\x27,
      }),
    /insecure default/,
  );
});

test(\x27accepts a real admin secret in production\x27, () => {
  const env = loadAdminEnv({
    RAILWAY_ENVIRONMENT: \x27production\x27,
    ZWIBBA_API_BASE_URL: \x27https://api.example\x27,
    ZWIBBA_ADMIN_SHARED_SECRET: \x27a-real-strong-secret\x27,
  });
  assert.equal(env.sharedSecret, \x27a-real-strong-secret\x27);
});

test(\x27keeps the convenience default outside production\x27, () => {
  const env = loadAdminEnv({ ZWIBBA_API_BASE_URL: \x27http://127.0.0.1:3200\x27 });
  assert.equal(env.sharedSecret, \x27zwibba-admin-secret\x27);
});
