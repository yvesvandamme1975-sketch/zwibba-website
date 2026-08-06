const STORAGE_KEY = 'zwibba_app_country';

function normalizeStoredCountry(value) {
  return value === 'BE' || value === 'CD' ? value : null;
}

export function createCountryPreference({ storage }) {
  return {
    getStoredCountry() {
      try {
        return normalizeStoredCountry(storage.getItem(STORAGE_KEY));
      } catch {
        return null;
      }
    },
    setStoredCountry(countryCode) {
      const normalized = normalizeStoredCountry(countryCode);

      if (!normalized) {
        return;
      }

      try {
        storage.setItem(STORAGE_KEY, normalized);
      } catch {
        // stockage indisponible : préférence non persistée, sans erreur
      }
    },
  };
}

export function readGeoCountry(cookieString) {
  const match = /(?:^|;\s*)zwibba_geo=([A-Z]{2})(?:;|$)/.exec(cookieString ?? '');

  return match ? match[1] : null;
}
