// Keep the original response available to each service while notifying the app
// when the server requires a newer contract for the currently connected account.
export function createLegalAwareFetch({ fetchFn, getSessionToken, onTermsRequired }) {
  return async (input, options = {}) => {
    const headers = new Headers(options.headers ?? (input instanceof Request ? input.headers : undefined));
    const requestToken = (headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
    const response = await fetchFn(input, options);
    if (response.status === 428 && requestToken && requestToken === getSessionToken()) {
      onTermsRequired();
    }
    return response;
  };
}
