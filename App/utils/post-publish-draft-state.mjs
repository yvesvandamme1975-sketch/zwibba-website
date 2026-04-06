export function shouldRetainDraftAfterPublish(outcome = {}) {
  return outcome?.status === 'blocked_needs_fix';
}

const draftlessAllowedRouteTypes = new Set([
  'auth-welcome',
  'buy',
  'capture',
  'listing',
  'messages',
  'otp',
  'phone',
  'profile',
  'sell',
  'thread',
  'wallet',
]);

export function resolveDraftlessSellerRoute({
  routeType = 'sell',
  publishedDraft = null,
  publishOutcome = null,
} = {}) {
  if (routeType === 'success') {
    return publishedDraft || publishOutcome ? 'success' : 'profile';
  }

  if (draftlessAllowedRouteTypes.has(routeType)) {
    return routeType;
  }

  return 'capture';
}
