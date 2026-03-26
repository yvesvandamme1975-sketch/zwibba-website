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

export function createChatService({
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
    async createThread({
      listingId,
      session,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/chat/threads`, {
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
        throw await parseError(response, 'Impossible d’ouvrir cette conversation.');
      }

      return response.json();
    },

    async fetchInbox({
      session,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/chat/threads`, {
        method: 'GET',
        headers: sessionHeaders(session),
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible de charger vos messages.');
      }

      return response.json();
    },

    async fetchThread({
      session,
      threadId,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/chat/threads/${encodeURIComponent(threadId)}`, {
        method: 'GET',
        headers: sessionHeaders(session),
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible de charger cette conversation.');
      }

      return response.json();
    },

    async sendMessage({
      body,
      session,
      threadId,
    }) {
      const response = await fetchFn(
        `${apiBaseUrl}/chat/threads/${encodeURIComponent(threadId)}/messages`,
        {
          method: 'POST',
          headers: {
            ...sessionHeaders(session),
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            body,
          }),
        },
      );

      if (!response.ok) {
        throw await parseError(response, 'Impossible d’envoyer ce message.');
      }

      return response.json();
    },
  };
}
