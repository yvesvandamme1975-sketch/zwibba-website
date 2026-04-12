function createHttpError(message, status) {
  const error = new Error(message);

  error.status = status;
  return error;
}

async function parseError(response, fallbackMessage) {
  try {
    const json = await response.json();
    const message = json?.message;

    if (typeof message === 'string' && message.trim()) {
      return createHttpError(message, response.status);
    }
  } catch {}

  return createHttpError(fallbackMessage, response.status);
}

function sessionHeaders(session) {
  return {
    authorization: `Bearer ${session.sessionToken}`,
  };
}

export function createProfileService({
  apiBaseUrl,
  fetchFn = globalThis.fetch,
} = {}) {
  if (!apiBaseUrl) {
    throw new Error('An API base URL is required.');
  }

  if (typeof fetchFn !== 'function') {
    throw new Error('A fetch implementation is required.');
  }

  return {
    async fetchProfile({
      session,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/profile`, {
        method: 'GET',
        headers: sessionHeaders(session),
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible de charger votre profil.');
      }

      return response.json();
    },

    async saveProfile({
      area,
      session,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/profile`, {
        method: 'POST',
        headers: {
          ...sessionHeaders(session),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          area,
        }),
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible de sauvegarder votre zone.');
      }

      return response.json();
    },

    async listCities({
      countryCode,
    }) {
      const response = await fetchFn(
        `${apiBaseUrl}/locations/cities?countryCode=${encodeURIComponent(countryCode)}`,
        {
          method: 'GET',
        },
      );

      if (!response.ok) {
        throw await parseError(response, 'Impossible de charger les villes.');
      }

      const json = await response.json();
      return Array.isArray(json?.items) ? json.items : [];
    },

    async suggestCity({
      countryCode,
      label,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/locations/suggestions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          countryCode,
          label,
          type: 'city',
        }),
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible d’ajouter cette ville.');
      }

      return response.json();
    },
  };
}
