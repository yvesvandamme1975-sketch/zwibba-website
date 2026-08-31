import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBaseUrl } from '../shared/api-base-url.mjs';

test('returns the configured url without trailing slash', () => {
  assert.equal(
    resolveApiBaseUrl({ ZWIBBA_API_BASE_URL: 'https://api.example.com/' }),
    'https://api.example.com',
  );
});

test('throws in production when the url is missing', () => {
  assert.throws(
    () => resolveApiBaseUrl({ NODE_ENV: 'production' }),
    /ZWIBBA_API_BASE_URL/,
  );
});

test('falls back to the dev default outside production', () => {
  assert.equal(
    resolveApiBaseUrl({ NODE_ENV: 'test' }),
    'https://api.zwibba.com',
  );
});

test('throws on railway production when the url is missing', () => {
  assert.throws(
    () => resolveApiBaseUrl({ RAILWAY_ENVIRONMENT: 'production' }),
    /ZWIBBA_API_BASE_URL/,
  );
});
