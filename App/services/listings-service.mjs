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

export function createListingsService({
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
    async getListingDetail(slug, { session } = {}) {
      const headers = {};

      if (session?.sessionToken) {
        headers.authorization = `Bearer ${session.sessionToken}`;
      }

      const response = await fetchFn(`${apiBaseUrl}/listings/${encodeURIComponent(slug)}`, {
        headers,
        method: 'GET',
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible de charger cette annonce.');
      }

      return response.json();
    },

    async listBrowseFeed() {
      const response = await fetchFn(`${apiBaseUrl}/listings`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible de charger les annonces.');
      }

      return response.json();
    },
  };
}
