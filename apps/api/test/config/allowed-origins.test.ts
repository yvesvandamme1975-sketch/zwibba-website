import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAllowedOrigins } from '../../src/config/allowed-origins';

test('defaults to the production website origin when unset', () => {
  const origins = resolveAllowedOrigins({});
  assert.ok(origins.includes('https://website-production-7a12.up.railway.app'));
});

test('parses a comma-separated override and trims entries', () => {
  const origins = resolveAllowedOrigins({
    ZWIBBA_ALLOWED_ORIGINS: 'https://a.example , https://b.example',
  });
  assert.deepEqual(origins, ['https://a.example', 'https://b.example']);
});

test('falls back to defaults on a blank override', () => {
  const origins = resolveAllowedOrigins({ ZWIBBA_ALLOWED_ORIGINS: '   ' });
  assert.ok(origins.includes('https://website-production-7a12.up.railway.app'));
});
