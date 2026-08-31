// Fallback for when the build did not inject window.ZWIBBA_API_BASE_URL
// (scripts/build.mjs writes it into the App entry). The stable custom domain,
// not Railway's generated name.
const defaultApiBaseUrl = 'https://api.zwibba.com';

function normalizeApiBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/g, '');
}

export function createApiConfig({
  globalObject = globalThis,
} = {}) {
  const configuredBaseUrl = normalizeApiBaseUrl(globalObject?.ZWIBBA_API_BASE_URL);

  return {
    apiBaseUrl: configuredBaseUrl || defaultApiBaseUrl,
  };
}
