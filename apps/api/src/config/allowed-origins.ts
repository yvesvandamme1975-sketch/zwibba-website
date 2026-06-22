type EnvSource = NodeJS.ProcessEnv | Record<string, string | undefined>;

const DEFAULT_ALLOWED_ORIGINS = [
  'https://website-production-7a12.up.railway.app',
  'http://localhost:3003',
  'http://127.0.0.1:3003',
];

export function resolveAllowedOrigins(source: EnvSource = process.env): string[] {
  const configured = source.ZWIBBA_ALLOWED_ORIGINS;

  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  return [...DEFAULT_ALLOWED_ORIGINS];
}
