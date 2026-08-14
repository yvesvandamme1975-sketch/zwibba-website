import assert from 'node:assert/strict';
import test from 'node:test';

import { loadEnv } from '../../src/config/env';

test('loadEnv returns the validated production env contract', () => {
  const env = loadEnv({
    AI_PROVIDER: 'multi',
    AI_DRAFT_DAILY_LIMIT: '250',
    ANTHROPIC_API_KEY: 'anthropic-test',
    ANTHROPIC_MODEL: 'claude-3-5-haiku-latest',
    APP_BASE_URL: 'https://zwibba.example',
    DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
    GEMINI_API_KEY: 'gemini-test',
    GEMINI_MODEL: 'gemini-2.5-flash-lite',
    MISTRAL_API_KEY: 'mistral-test',
    MISTRAL_MODEL: 'pixtral-12b-2409',
    NODE_ENV: 'test',
    OTP_PROVIDER: 'meta',
    PORT: '3200',
    R2_ACCESS_KEY_ID: 'r2-access-key',
    R2_ACCOUNT_ID: 'r2-account',
    R2_BUCKET: 'zwibba-media',
    R2_PUBLIC_BASE_URL: 'https://cdn.zwibba.example',
    R2_S3_ENDPOINT: 'https://r2.example.com',
    R2_SECRET_ACCESS_KEY: 'r2-secret',
    META_GRAPH_API_VERSION: '20.0',
    META_WHATSAPP_ACCESS_TOKEN: 'meta-access-token',
    META_WHATSAPP_PHONE_NUMBER_ID: '1234567890',
    META_WHATSAPP_TEMPLATE_LANG: 'fr',
    META_WHATSAPP_TEMPLATE_NAME: 'zwibba_auth_code',
    ZWIBBA_ADMIN_SHARED_SECRET: 'zwibba-admin-secret',
  });

  assert.equal(env.appBaseUrl, 'https://zwibba.example');
  assert.equal(env.admin.sharedSecret, 'zwibba-admin-secret');
  assert.equal(env.boost.enabled, true);
  assert.equal(env.databaseUrl, 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba');
  assert.equal(env.otp.provider, 'meta');
  assert.equal(env.port, 3200);
  assert.equal(env.r2.bucket, 'zwibba-media');
  assert.equal(env.ai.provider, 'multi');
  assert.ok(env.ai.gemini);
  assert.equal(env.ai.gemini.model, 'gemini-2.5-flash-lite');
  assert.ok(env.ai.anthropic);
  assert.equal(env.ai.anthropic.model, 'claude-3-5-haiku-latest');
  assert.ok(env.ai.mistral);
  assert.equal(env.ai.mistral.model, 'pixtral-12b-2409');
  assert.equal(env.ai.draftDailyLimit, 250);
  assert.ok(env.meta);
  assert.equal(env.meta.phoneNumberId, '1234567890');
  assert.equal(env.meta.accessToken, 'meta-access-token');
  assert.equal(env.meta.templateName, 'zwibba_auth_code');
  assert.equal(env.meta.templateLang, 'fr');
  assert.equal(env.meta.graphApiVersion, '20.0');
});

test('loadEnv defaults the ai draft daily limit to 500 when unset', () => {
  const env = loadEnv({
    AI_PROVIDER: 'stub',
    APP_BASE_URL: 'https://zwibba.example',
    DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
    DEMO_OTP_ALLOWLIST: '+243990000001',
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

  assert.equal(env.ai.draftDailyLimit, 500);
});

test('loadEnv rejects an invalid ai draft daily limit', () => {
  assert.throws(
    () =>
      loadEnv({
        AI_PROVIDER: 'stub',
        AI_DRAFT_DAILY_LIMIT: 'abc',
        APP_BASE_URL: 'https://zwibba.example',
        DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
        DEMO_OTP_ALLOWLIST: '+243990000001',
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
      }),
    /AI_DRAFT_DAILY_LIMIT must be a positive integer/,
  );
});

test('loadEnv returns the demo otp contract in production without Meta vars', () => {
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
  assert.equal(env.meta, undefined);
});

test('loadEnv defaults OTP_PROVIDER to demo', () => {
  const env = loadEnv({});

  assert.equal(env.otp.provider, 'demo');
  assert.deepEqual(env.otp.demoAllowlist, ['+243990000001']);
  assert.equal(env.otp.demoCode, '123456');
});

test('loadEnv supports a mistral-only ai provider mode', () => {
  const env = loadEnv({
    AI_PROVIDER: 'mistral',
    APP_BASE_URL: 'https://zwibba.example',
    DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
    MISTRAL_API_KEY: 'mistral-test',
    MISTRAL_MODEL: 'pixtral-12b-2409',
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
  });

  assert.equal(env.ai.provider, 'mistral');
  assert.ok(env.ai.mistral);
  assert.equal(env.ai.mistral.model, 'pixtral-12b-2409');
  assert.equal(env.ai.gemini, undefined);
  assert.equal(env.ai.anthropic, undefined);
});

test('loadEnv supports a gemini-only multi provider mode', () => {
  const env = loadEnv({
    AI_PROVIDER: 'multi',
    APP_BASE_URL: 'https://zwibba.example',
    DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
    GEMINI_API_KEY: 'gemini-test',
    GEMINI_MODEL: 'gemini-2.5-flash-lite',
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
  });

  assert.equal(env.ai.provider, 'multi');
  assert.ok(env.ai.gemini);
  assert.equal(env.ai.gemini.model, 'gemini-2.5-flash-lite');
  assert.equal(env.ai.anthropic, undefined);
  assert.equal(env.ai.mistral, undefined);
});

test('loadEnv keeps Google Vision enrichment disabled by default', () => {
  const env = loadEnv({
    AI_PROVIDER: 'multi',
    APP_BASE_URL: 'https://zwibba.example',
    DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
    GEMINI_API_KEY: 'gemini-test',
    GEMINI_MODEL: 'gemini-2.5-flash-lite',
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
  });

  assert.equal(env.ai.googleVisionEnrichmentEnabled, false);
  assert.equal(env.ai.googleVision, undefined);
});

test('loadEnv supports enabled Google Vision enrichment when config is present', () => {
  const env = loadEnv({
    AI_PROVIDER: 'multi',
    AI_GOOGLE_VISION_ENRICHMENT_ENABLED: 'true',
    APP_BASE_URL: 'https://zwibba.example',
    DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
    GEMINI_API_KEY: 'gemini-test',
    GEMINI_MODEL: 'gemini-2.5-flash-lite',
    GOOGLE_CLOUD_PROJECT_ID: 'zwibba-prod',
    GOOGLE_CLOUD_VISION_API_KEY: 'vision-api-key',
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
  });

  assert.equal(env.ai.googleVisionEnrichmentEnabled, true);
  assert.ok(env.ai.googleVision);
  assert.equal(env.ai.googleVision.projectId, 'zwibba-prod');
  assert.equal(env.ai.googleVision.apiKey, 'vision-api-key');
});

test('loadEnv requires Google Vision config when enrichment is enabled', () => {
  assert.throws(
    () =>
      loadEnv({
        AI_PROVIDER: 'multi',
        AI_GOOGLE_VISION_ENRICHMENT_ENABLED: 'true',
        APP_BASE_URL: 'https://zwibba.example',
        DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
        GEMINI_API_KEY: 'gemini-test',
        GEMINI_MODEL: 'gemini-2.5-flash-lite',
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
    /Missing required env value: GOOGLE_CLOUD_PROJECT_ID/,
  );
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

test('loadEnv requires mistral config when mistral provider is selected', () => {
  assert.throws(
    () =>
      loadEnv({
        AI_PROVIDER: 'mistral',
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
    /Missing required env value: MISTRAL_API_KEY/,
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

test('loadEnv requires Meta config in production when meta provider is selected', () => {
  assert.throws(
    () =>
      loadEnv({
        AI_PROVIDER: 'stub',
        APP_BASE_URL: 'https://zwibba.example',
        DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
        NODE_ENV: 'production',
        OTP_PROVIDER: 'meta',
        PORT: '3200',
        R2_ACCESS_KEY_ID: 'r2-access-key',
        R2_ACCOUNT_ID: 'r2-account',
        R2_BUCKET: 'zwibba-media',
        R2_PUBLIC_BASE_URL: 'https://cdn.zwibba.example',
        R2_S3_ENDPOINT: 'https://r2.example.com',
        R2_SECRET_ACCESS_KEY: 'r2-secret',
        ZWIBBA_ADMIN_SHARED_SECRET: 'zwibba-admin-secret',
      }),
    /Missing required env value: META_WHATSAPP_PHONE_NUMBER_ID/,
  );
});

test('loadEnv rejects twilio as an OTP provider', () => {
  assert.throws(
    () =>
      loadEnv({
        OTP_PROVIDER: 'twilio',
      }),
    /OTP_PROVIDER must be either "demo" or "meta"/,
  );
});

test('loadEnv exposes support config with sane defaults', () => {
  const env = loadEnv({});

  assert.equal(env.support.whatsappVerifyToken, 'whatsapp-verify-token');
  assert.equal(env.support.metaAppSecret, 'meta-app-secret');
  assert.equal(env.support.escalationEmail, 'hello@aivesconsulting.com');
  assert.equal(env.support.emailProviderApiKey, 'support-email-api-key');
});

test('loadEnv defaults the support escalation email even when explicit support env is set', () => {
  const env = loadEnv({
    WHATSAPP_VERIFY_TOKEN: 'a-real-verify-token',
    META_APP_SECRET: 'a-real-app-secret',
    SUPPORT_EMAIL_API_KEY: 'a-real-email-api-key',
  });

  assert.equal(env.support.whatsappVerifyToken, 'a-real-verify-token');
  assert.equal(env.support.metaAppSecret, 'a-real-app-secret');
  assert.equal(env.support.escalationEmail, 'hello@aivesconsulting.com');
  assert.equal(env.support.emailProviderApiKey, 'a-real-email-api-key');
});

test('loadEnv defaults ANTHROPIC_MODEL to claude-haiku-4-5-20251001', () => {
  const env = loadEnv({
    AI_PROVIDER: 'multi',
    APP_BASE_URL: 'https://zwibba.example',
    DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
    ANTHROPIC_API_KEY: 'anthropic-test',
    GEMINI_API_KEY: 'gemini-test',
    GEMINI_MODEL: 'gemini-2.5-flash-lite',
    NODE_ENV: 'test',
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
  });

  assert.ok(env.ai.anthropic);
  assert.equal(env.ai.anthropic.model, 'claude-haiku-4-5-20251001');
});

test('treats RAILWAY_ENVIRONMENT production as production', () => {
  const source = {
    AI_PROVIDER: 'stub',
    DATABASE_URL: 'postgresql://zwibba:zwibba@127.0.0.1:5432/zwibba',
    NODE_ENV: 'test',
    DEMO_OTP_ALLOWLIST: '+243990000001',
    DEMO_OTP_CODE: '123456',
    OTP_PROVIDER: 'demo',
    PORT: '3200',
    R2_ACCESS_KEY_ID: 'r2-access-key',
    R2_ACCOUNT_ID: 'r2-account',
    R2_BUCKET: 'zwibba-media',
    R2_PUBLIC_BASE_URL: 'https://cdn.zwibba.example',
    R2_S3_ENDPOINT: 'https://r2.example.com',
    R2_SECRET_ACCESS_KEY: 'r2-secret',
    RAILWAY_ENVIRONMENT: 'production',
    ZWIBBA_ADMIN_SHARED_SECRET: 'a-real-secret',
  };
  assert.throws(() => loadEnv(source), /Missing required env value/);
});
