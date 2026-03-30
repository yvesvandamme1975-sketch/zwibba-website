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

export function createSellerListingsService({
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
    async applyLifecycleAction({
      action,
      listingId,
      reasonCode = '',
      session,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/listings/${encodeURIComponent(listingId)}/lifecycle`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session.sessionToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action,
          reasonCode,
        }),
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible de mettre à jour cette annonce.');
      }

      return response.json();
    },

    async listMine({
      session,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/listings/mine`, {
        method: 'GET',
        headers: {
          authorization: `Bearer ${session.sessionToken}`,
        },
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible de charger vos annonces.');
      }

      return response.json();
    },
  };
}
