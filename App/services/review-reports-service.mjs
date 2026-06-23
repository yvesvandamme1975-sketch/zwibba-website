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

export function createReviewReportsService({
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
    async reportReview({
      reason,
      reviewId,
      session,
    }) {
      const response = await fetchFn(
        `${apiBaseUrl}/reviews/${encodeURIComponent(reviewId)}/report`,
        {
          method: 'POST',
          headers: {
            ...sessionHeaders(session),
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            reason,
          }),
        },
      );

      if (!response.ok) {
        throw await parseError(response, 'Impossible de signaler cet avis.');
      }

      return response.json();
    },
  };
}
