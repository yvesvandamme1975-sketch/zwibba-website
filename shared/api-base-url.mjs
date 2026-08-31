// Dev/test convenience default only — production REQUIRES ZWIBBA_API_BASE_URL
// and throws below when it is missing, so this string is never what serves
// real traffic. It points at the stable custom domain rather than Railway's
// generated `*.up.railway.app` name, which changes if the service is recreated.
const DEV_API_BASE_URL = 'https://api.zwibba.com';

export function resolveApiBaseUrl(env = process.env) {
  const configuredUrl = env.ZWIBBA_API_BASE_URL;

  if (typeof configuredUrl === 'string' && configuredUrl.trim() !== '') {
    return configuredUrl.replace(/\/+$/, '');
  }

  if (env.NODE_ENV === 'production' || env.RAILWAY_ENVIRONMENT === 'production') {
    throw new Error('ZWIBBA_API_BASE_URL is required in production');
  }

  return DEV_API_BASE_URL;
}
