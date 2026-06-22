export const OTP_RATE_WINDOW_MS = 15 * 60 * 1000;
export const OTP_RATE_MAX_REQUESTS = 5;

export function resolveOtpRateWindowStart(
  now: Date = new Date(),
  windowMs: number = OTP_RATE_WINDOW_MS,
): Date {
  return new Date(now.getTime() - windowMs);
}

export function isOtpRequestRateExceeded(
  recentAttemptCount: number,
  max: number = OTP_RATE_MAX_REQUESTS,
): boolean {
  return recentAttemptCount >= max;
}
