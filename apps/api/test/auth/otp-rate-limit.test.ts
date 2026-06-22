import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OTP_RATE_MAX_REQUESTS,
  OTP_RATE_WINDOW_MS,
  isOtpRequestRateExceeded,
  resolveOtpRateWindowStart,
} from '../../src/auth/otp-rate-limit';

test('resolveOtpRateWindowStart returns now minus the window', () => {
  const now = new Date('2026-06-22T12:00:00.000Z');
  assert.equal(
    resolveOtpRateWindowStart(now).getTime(),
    now.getTime() - OTP_RATE_WINDOW_MS,
  );
});

test('isOtpRequestRateExceeded is false below the max', () => {
  assert.equal(isOtpRequestRateExceeded(OTP_RATE_MAX_REQUESTS - 1), false);
});

test('isOtpRequestRateExceeded is true at the max', () => {
  assert.equal(isOtpRequestRateExceeded(OTP_RATE_MAX_REQUESTS), true);
});

test('isOtpRequestRateExceeded is true above the max', () => {
  assert.equal(isOtpRequestRateExceeded(OTP_RATE_MAX_REQUESTS + 3), true);
});
