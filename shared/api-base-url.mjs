const DEV_API_BASE_URL = 'https://api-production-b1b58.up.railway.app';

export function resolveApiBaseUrl(env = process.env) {
  const configuredUrl = env.ZWIBBA_API_BASE_URL;

  if (typeof configuredUrl === 'string' && configuredUrl.trim() !== '') {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('ZWIBBA_API_BASE_URL is required in production');
  }

  return DEV_API_BASE_URL;
}
