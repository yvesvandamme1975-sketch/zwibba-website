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

export function createReviewsService({
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
    async submitReview({
      comment,
      rating,
      session,
      slug,
    }) {
      const response = await fetchFn(
        `${apiBaseUrl}/listings/${encodeURIComponent(slug)}/reviews`,
        {
          method: 'POST',
          headers: {
            ...sessionHeaders(session),
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            comment,
            rating,
          }),
        },
      );

      if (!response.ok) {
        throw await parseError(response, 'Impossible d’envoyer votre avis.');
      }

      return response.json();
    },
  };
}
