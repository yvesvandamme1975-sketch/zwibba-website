// Keep the original response available to each service while notifying the app
// when the server requires a newer contract for the currently connected account,
// or no longer knows that account's session (expired or revoked).
export function createLegalAwareFetch({ fetchFn, getSessionToken, onTermsRequired, onSessionRejected = () => {} }) {
  return async (input, options = {}) => {
    const headers = new Headers(options.headers ?? (input instanceof Request ? input.headers : undefined));
    const requestToken = (headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    const response = await fetchFn(input, options);
    if (requestToken && requestToken === getSessionToken()) {
      if (response.status === 428) onTermsRequired();
      if (response.status === 401) onSessionRejected();
    }
    return response;
  };
}
