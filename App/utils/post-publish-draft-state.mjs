export function shouldRetainDraftAfterPublish(outcome = {}) {
  return outcome?.status === 'blocked_needs_fix';
}
