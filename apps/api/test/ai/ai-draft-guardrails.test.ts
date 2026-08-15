import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AI_DRAFT_RATE_MAX_REQUESTS,
  AI_DRAFT_RATE_WINDOW_MS,
  isAllowedDraftPhotoUrl,
  isDraftRateExceeded,
  pruneDraftAttempts,
  resolveClientIp,
} from '../../src/ai/ai-draft-guardrails';

test('isAllowedDraftPhotoUrl accepts photos from the configured CDN base', () => {
  assert.equal(
    isAllowedDraftPhotoUrl(
      'https://cdn.zwibba.example/draft-photos/capture/photo.jpg',
      'https://cdn.zwibba.example',
    ),
    true,
  );
});

test('isAllowedDraftPhotoUrl rejects non-CDN and unsafe URL shapes', () => {
  assert.equal(
    isAllowedDraftPhotoUrl(
      'https://cdn.zwibba.example.attacker.com/photo.jpg',
      'https://cdn.zwibba.example',
    ),
    false,
  );
  assert.equal(
    isAllowedDraftPhotoUrl(
      'http://cdn.zwibba.example/photo.jpg',
      'https://cdn.zwibba.example',
    ),
    false,
  );
  assert.equal(
    isAllowedDraftPhotoUrl(
      'http://169.254.169.254/latest/meta-data',
      'https://cdn.zwibba.example',
    ),
    false,
  );
  assert.equal(
    isAllowedDraftPhotoUrl('not-a-url', 'https://cdn.zwibba.example'),
    false,
  );
});

test('isAllowedDraftPhotoUrl normalizes a trailing slash on the base URL', () => {
  assert.equal(
    isAllowedDraftPhotoUrl(
      'https://cdn.zwibba.example/draft-photos/capture/photo.jpg',
      'https://cdn.zwibba.example/',
    ),
    true,
  );
});

test('resolveClientIp uses the Railway proxy address from x-forwarded-for', () => {
  assert.equal(
    resolveClientIp({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }, '127.0.0.1'),
    '10.0.0.1',
  );
});

test('resolveClientIp falls back to the socket address', () => {
  assert.equal(resolveClientIp({}, '127.0.0.1'), '127.0.0.1');
});

test('resolveClientIp uses the last entry from the last array header value', () => {
  assert.equal(
    resolveClientIp({ 'x-forwarded-for': ['1.2.3.4', '10.0.0.1'] }),
    '10.0.0.1',
  );
});

test('resolveClientIp returns unknown when no address is available', () => {
  assert.equal(resolveClientIp({ 'x-forwarded-for': ' , ' }, ' '), 'unknown');
});

test('pruneDraftAttempts removes stale timestamps and keeps recent attempts', () => {
  const nowMs = Date.parse('2026-08-14T12:00:00.000Z');
  const stale = nowMs - AI_DRAFT_RATE_WINDOW_MS - 1;
  const boundary = nowMs - AI_DRAFT_RATE_WINDOW_MS;
  const recent = nowMs - 1_000;

  assert.deepEqual(pruneDraftAttempts([stale, boundary, recent], nowMs), [
    boundary,
    recent,
  ]);
});

test('isDraftRateExceeded is false below the max', () => {
  assert.equal(isDraftRateExceeded(AI_DRAFT_RATE_MAX_REQUESTS - 1), false);
});

test('isDraftRateExceeded is true at and above the max', () => {
  assert.equal(isDraftRateExceeded(AI_DRAFT_RATE_MAX_REQUESTS), true);
  assert.equal(isDraftRateExceeded(AI_DRAFT_RATE_MAX_REQUESTS + 1), true);
});

test('ai draft rate limit constants match the production policy', () => {
  assert.equal(AI_DRAFT_RATE_WINDOW_MS, 15 * 60 * 1000);
  assert.equal(AI_DRAFT_RATE_MAX_REQUESTS, 5);
});
