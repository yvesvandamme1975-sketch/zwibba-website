export function createChatLiveRefreshController({
  intervalMs = 4_000,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
} = {}) {
  let activeConfig = null;
  let activeKey = '';
  let generation = 0;
  let timerId = null;
  let refreshInFlight = false;

  function clearScheduledRefresh() {
    if (timerId !== null) {
      clearTimeoutFn(timerId);
      timerId = null;
    }
  }

  function stop() {
    generation += 1;
    activeConfig = null;
    activeKey = '';
    refreshInFlight = false;
    clearScheduledRefresh();
  }

  function resolveRouteKey({
    route,
    session,
  }) {
    if (!session?.sessionToken) {
      return '';
    }

    if (route?.type === 'thread' && route.threadId) {
      return `thread:${route.threadId}`;
    }

    return 'inbox';
  }

  function scheduleNextRefresh(expectedGeneration) {
    clearScheduledRefresh();
    timerId = setTimeoutFn(async () => {
      timerId = null;

      if (expectedGeneration !== generation || !activeConfig || refreshInFlight) {
        return;
      }

      refreshInFlight = true;

      try {
        if (activeConfig.route.type === 'thread' && activeConfig.route.threadId) {
          await activeConfig.refreshThread(activeConfig.route.threadId);
        } else {
          await activeConfig.refreshInbox();
        }
      } finally {
        refreshInFlight = false;
      }

      if (expectedGeneration === generation && activeConfig) {
        scheduleNextRefresh(expectedGeneration);
      }
    }, intervalMs);
  }

  return {
    stop,

    sync(config) {
      const nextKey = resolveRouteKey(config);

      if (!nextKey) {
        stop();
        return;
      }

      activeConfig = config;

      if (nextKey !== activeKey) {
        generation += 1;
        activeKey = nextKey;
        refreshInFlight = false;
        scheduleNextRefresh(generation);
        return;
      }

      if (!timerId && !refreshInFlight) {
        scheduleNextRefresh(generation);
      }
    },
  };
}
