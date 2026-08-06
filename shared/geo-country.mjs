const GEO_COOKIE_NAME = 'zwibba_geo';
const GEO_COOKIE_MAX_AGE_SECONDS = 86400;

export function resolveGeoCountry(headers) {
  const rawValue = headers?.['cf-ipcountry'];
  const normalized = typeof rawValue === 'string' ? rawValue.trim().toUpperCase() : '';

  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

// Volontairement sans HttpOnly : l'App lit ce cookie via document.cookie.
export function buildGeoCookie(countryCode) {
  return `${GEO_COOKIE_NAME}=${countryCode}; Path=/; Max-Age=${GEO_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}
