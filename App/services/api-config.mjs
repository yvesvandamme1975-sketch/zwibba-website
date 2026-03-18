const defaultApiBaseUrl = 'https://api-production-b1b58.up.railway.app';

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
