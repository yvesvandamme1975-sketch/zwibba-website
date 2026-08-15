import assert from 'node:assert/strict';
import test from 'node:test';

import { AI_DRAFT_RATE_WINDOW_MS } from '../../src/ai/ai-draft-guardrails';
import { AiDraftLimiterService } from '../../src/ai/ai-draft-limiter.service';

test('evaluateDraftRequest rejects the sixth request from one IP in the window', () => {
  const now = new Date('2026-08-14T12:00:00.000Z');
  const limiter = new AiDraftLimiterService({ dailyLimit: 500, now: () => now });

  assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ok');
  assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ok');
  assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ok');
  assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ok');
  assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ok');
  assert.equal(
    limiter.evaluateDraftRequest('10.0.0.1'),
    'ip_rate_exceeded',
  );
});

test('evaluateDraftRequest allows the same IP after the sliding window expires', () => {
  let currentMs = Date.parse('2026-08-14T12:00:00.000Z');
  const limiter = new AiDraftLimiterService({
    dailyLimit: 500,
    now: () => new Date(currentMs),
  });

  for (let index = 0; index < 5; index += 1) {
    assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ok');
  }
  assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ip_rate_exceeded');

  currentMs += AI_DRAFT_RATE_WINDOW_MS + 1;

  assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ok');
});

test('evaluateDraftRequest keeps sliding-window counts isolated by IP', () => {
  const now = new Date('2026-08-14T12:00:00.000Z');
  const limiter = new AiDraftLimiterService({ dailyLimit: 500, now: () => now });

  for (let index = 0; index < 5; index += 1) {
    assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ok');
  }

  assert.equal(limiter.evaluateDraftRequest('10.0.0.2'), 'ok');
});

test('evaluateDraftRequest enforces the global daily cap', () => {
  const now = new Date('2026-08-14T12:00:00.000Z');
  const limiter = new AiDraftLimiterService({ dailyLimit: 3, now: () => now });

  assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ok');
  assert.equal(limiter.evaluateDraftRequest('10.0.0.2'), 'ok');
  assert.equal(limiter.evaluateDraftRequest('10.0.0.3'), 'ok');
  assert.equal(limiter.evaluateDraftRequest('10.0.0.4'), 'daily_cap_reached');
});

test('evaluateDraftRequest resets the global counter on the next UTC day', () => {
  let current = new Date('2026-08-14T23:59:00.000Z');
  const limiter = new AiDraftLimiterService({
    dailyLimit: 1,
    now: () => current,
  });

  assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ok');
  assert.equal(limiter.evaluateDraftRequest('10.0.0.2'), 'daily_cap_reached');

  current = new Date('2026-08-15T00:01:00.000Z');

  assert.equal(limiter.evaluateDraftRequest('10.0.0.3'), 'ok');
});

test('evaluateDraftRequest does not increment the daily counter for rejected requests', () => {
  const now = new Date('2026-08-14T12:00:00.000Z');
  const limiter = new AiDraftLimiterService({ dailyLimit: 6, now: () => now });

  for (let index = 0; index < 5; index += 1) {
    assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ok');
  }
  assert.equal(limiter.evaluateDraftRequest('10.0.0.1'), 'ip_rate_exceeded');
  assert.equal(limiter.evaluateDraftRequest('10.0.0.2'), 'ok');
  assert.equal(limiter.evaluateDraftRequest('10.0.0.3'), 'daily_cap_reached');
});
