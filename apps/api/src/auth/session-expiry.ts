export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function computeSessionExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + SESSION_TTL_MS);
}

export function isSessionExpired(
  session: { expiresAt: Date | null },
  now: Date = new Date(),
): boolean {
  return session.expiresAt !== null && session.expiresAt.getTime() <= now.getTime();
}
