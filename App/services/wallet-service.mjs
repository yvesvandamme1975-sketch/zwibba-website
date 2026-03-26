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

export function createWalletService({
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
    async activateBoost({
      listingId,
      session,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/boost`, {
        method: 'POST',
        headers: {
          ...sessionHeaders(session),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          listingId,
        }),
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible d’activer le boost.');
      }

      return response.json();
    },

    async fetchWallet({
      session,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/wallet`, {
        method: 'GET',
        headers: sessionHeaders(session),
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible de charger le portefeuille.');
      }

      return response.json();
    },
  };
}
