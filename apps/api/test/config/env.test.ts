import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnv } from '../../src/config/env';

test('loadEnv returns the validated production env contract', () => {
  const env = loadEnv({
    AI_PROVIDER: 'multi',
    ANTHROPIC_API_KEY: 'anthropic-test',
    ANTHROPIC_MODEL: 'claude-3-5-haiku-latest',
    APP_BASE_URL: 'https://zwibba.example',
    DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
    GEMINI_API_KEY: 'gemini-test',
    GEMINI_MODEL: 'gemini-2.5-flash-lite',
    MISTRAL_API_KEY: 'mistral-test',
    MISTRAL_MODEL: 'pixtral-12b-2409',
    NODE_ENV: 'test',
    OTP_PROVIDER: 'twilio',
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
    ZWIBBA_ADMIN_SHARED_SECRET: 'zwibba-admin-secret',
  });

  assert.equal(env.appBaseUrl, 'https://zwibba.example');
  assert.equal(env.admin.sharedSecret, 'zwibba-admin-secret');
  assert.equal(env.databaseUrl, 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba');
  assert.equal(env.otp.provider, 'twilio');
  assert.equal(env.port, 3200);
  assert.equal(env.r2.bucket, 'zwibba-media');
  assert.equal(env.ai.provider, 'multi');
  assert.ok(env.ai.gemini);
  assert.equal(env.ai.gemini.model, 'gemini-2.5-flash-lite');
  assert.ok(env.ai.anthropic);
  assert.equal(env.ai.anthropic.model, 'claude-3-5-haiku-latest');
  assert.ok(env.ai.mistral);
  assert.equal(env.ai.mistral.model, 'pixtral-12b-2409');
  assert.ok(env.twilio);
  assert.equal(env.twilio.verifyServiceSid, 'VA123456789');
});

test('loadEnv returns the demo otp contract in production without Twilio vars', () => {
  const env = loadEnv({
    AI_PROVIDER: 'stub',
    APP_BASE_URL: 'https://zwibba.example',
    DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
    DEMO_OTP_ALLOWLIST: '+243990000001,+243990000002',
    DEMO_OTP_CODE: '123456',
    NODE_ENV: 'production',
    OTP_PROVIDER: 'demo',
    PORT: '3200',
    R2_ACCESS_KEY_ID: 'r2-access-key',
    R2_ACCOUNT_ID: 'r2-account',
    R2_BUCKET: 'zwibba-media',
    R2_PUBLIC_BASE_URL: 'https://cdn.zwibba.example',
    R2_S3_ENDPOINT: 'https://r2.example.com',
    R2_SECRET_ACCESS_KEY: 'r2-secret',
    ZWIBBA_ADMIN_SHARED_SECRET: 'zwibba-admin-secret',
  });

  assert.equal(env.otp.provider, 'demo');
  assert.deepEqual(env.otp.demoAllowlist, ['+243990000001', '+243990000002']);
  assert.equal(env.otp.demoCode, '123456');
  assert.equal(env.ai.provider, 'stub');
  assert.equal(env.ai.gemini, undefined);
  assert.equal(env.ai.anthropic, undefined);
  assert.equal(env.ai.mistral, undefined);
  assert.equal(env.twilio, undefined);
});

test('loadEnv requires Gemini config in production when multi provider is selected', () => {
  assert.throws(
    () =>
      loadEnv({
        AI_PROVIDER: 'multi',
        APP_BASE_URL: 'https://zwibba.example',
        DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
        NODE_ENV: 'production',
        OTP_PROVIDER: 'demo',
        DEMO_OTP_ALLOWLIST: '+243990000001',
        DEMO_OTP_CODE: '123456',
        PORT: '3200',
        R2_ACCESS_KEY_ID: 'r2-access-key',
        R2_ACCOUNT_ID: 'r2-account',
        R2_BUCKET: 'zwibba-media',
        R2_PUBLIC_BASE_URL: 'https://cdn.zwibba.example',
        R2_S3_ENDPOINT: 'https://r2.example.com',
        R2_SECRET_ACCESS_KEY: 'r2-secret',
        ZWIBBA_ADMIN_SHARED_SECRET: 'zwibba-admin-secret',
      }),
    /Missing required env value: GEMINI_API_KEY/,
  );
});

test('loadEnv rejects missing demo otp config in production', () => {
  assert.throws(
    () =>
      loadEnv({
        AI_PROVIDER: 'stub',
        APP_BASE_URL: 'https://zwibba.example',
        DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
        DEMO_OTP_ALLOWLIST: '+243990000001',
        NODE_ENV: 'production',
        OTP_PROVIDER: 'demo',
        PORT: '3200',
        R2_ACCESS_KEY_ID: 'r2-access-key',
        R2_ACCOUNT_ID: 'r2-account',
        R2_BUCKET: 'zwibba-media',
        R2_PUBLIC_BASE_URL: 'https://cdn.zwibba.example',
        R2_S3_ENDPOINT: 'https://r2.example.com',
        R2_SECRET_ACCESS_KEY: 'r2-secret',
        ZWIBBA_ADMIN_SHARED_SECRET: 'zwibba-admin-secret',
      }),
    /Missing required env value: DEMO_OTP_CODE/,
  );
});

test('loadEnv rejects missing Twilio config in production when twilio provider is selected', () => {
  assert.throws(
    () =>
      loadEnv({
        AI_PROVIDER: 'stub',
        APP_BASE_URL: 'https://zwibba.example',
        DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
        NODE_ENV: 'production',
        OTP_PROVIDER: 'twilio',
        PORT: '3200',
        R2_ACCESS_KEY_ID: 'r2-access-key',
        R2_ACCOUNT_ID: 'r2-account',
        R2_BUCKET: 'zwibba-media',
        R2_PUBLIC_BASE_URL: 'https://cdn.zwibba.example',
        R2_S3_ENDPOINT: 'https://r2.example.com',
        R2_SECRET_ACCESS_KEY: 'r2-secret',
        ZWIBBA_ADMIN_SHARED_SECRET: 'zwibba-admin-secret',
      }),
    /Missing required env value: TWILIO_ACCOUNT_SID/,
  );
});
