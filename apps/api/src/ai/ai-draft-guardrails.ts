export const AI_DRAFT_RATE_WINDOW_MS = 15 * 60 * 1000;
export const AI_DRAFT_RATE_MAX_REQUESTS = 5;
export const AI_DRAFT_PHOTO_BASE_URL = 'AI_DRAFT_PHOTO_BASE_URL';

export function isAllowedDraftPhotoUrl(
  photoUrl: string,
  publicBaseUrl: string,
): boolean {
  try {
    const parsedPhotoUrl = new URL(photoUrl);
    const parsedBaseUrl = new URL(publicBaseUrl);
    const basePath = parsedBaseUrl.pathname.endsWith('/')
      ? parsedBaseUrl.pathname
      : `${parsedBaseUrl.pathname}/`;

    return (
      parsedPhotoUrl.protocol === 'https:' &&
      parsedPhotoUrl.origin === parsedBaseUrl.origin &&
      parsedPhotoUrl.pathname.startsWith(basePath)
    );
  } catch {
    return false;
  }
}

export function resolveClientIp(
  headers: Record<string, string | string[] | undefined>,
  socketAddress?: string,
): string {
  const forwardedFor = headers['x-forwarded-for'];
  const headerValue = Array.isArray(forwardedFor)
    ? forwardedFor.at(-1)
    : forwardedFor;
  const forwardedAddress = headerValue
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .at(-1);

  const resolvedSocketAddress = socketAddress?.trim();
  return (forwardedAddress ?? resolvedSocketAddress) || 'unknown';
}

export function pruneDraftAttempts(
  timestamps: number[],
  nowMs: number,
  windowMs: number = AI_DRAFT_RATE_WINDOW_MS,
): number[] {
  const windowStartMs = nowMs - windowMs;
  return timestamps.filter((timestamp) => timestamp >= windowStartMs);
}

export function isDraftRateExceeded(
  recentAttemptCount: number,
  max: number = AI_DRAFT_RATE_MAX_REQUESTS,
): boolean {
  return recentAttemptCount >= max;
}
