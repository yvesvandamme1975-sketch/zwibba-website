import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnv } from '../../src/config/env';

test('loadEnv returns the validated production env contract', () => {
  const env = loadEnv({
    APP_BASE_URL: 'https://zwibba.example',
    DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
    NODE_ENV: 'test',
    PORT: '3200',
    R2_ACCESS_KEY_ID: 'r2-access-key',
    R2_ACCOUNT_ID: 'r2-account',
    R2_BUCKET: 'zwibba-media',
    R2_PUBLIC_BASE_URL: 'https://cdn.zwibba.example',
    R2_S3_ENDPOINT: 'https://r2.example.com',
    R2_SECRET_ACCESS_KEY: 'r2-secret',
    TWILIO_ACCOUNT_SID: 'AC123456789',
    TWILIO_AUTH_TOKEN: 'twilio-auth-token',
    TWILIO_VERIFY_SERVICE_SID: 'VA123456789',
  });

  assert.equal(env.appBaseUrl, 'https://zwibba.example');
  assert.equal(env.databaseUrl, 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba');
  assert.equal(env.port, 3200);
  assert.equal(env.r2.bucket, 'zwibba-media');
  assert.equal(env.twilio.verifyServiceSid, 'VA123456789');
});
