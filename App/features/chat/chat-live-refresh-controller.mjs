export function createChatLiveRefreshController({
  counterIntervalMs = 60_000,
  intervalMs = 4_000,
  isDocumentHiddenFn = () => globalThis.document?.hidden === true,
  setTimeoutFn = globalThis.setTimeout,
  clearTimeoutFn = globalThis.clearTimeout,
} = {}) {
  const suspendedRouteTypes = new Set([
    'auth-welcome',
    'capture',
    'capture-result',
    'guidance',
    'otp',
    'phone',
    'profile',
    'publish',
    'review',
  ]);
  let activeConfig = null;
  let activeKey = '';
  let activeIntervalMs = intervalMs;
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
    activeIntervalMs = intervalMs;
    refreshInFlight = false;
    clearScheduledRefresh();
  }

  function resolveRefreshTarget({
    refreshUnreadMessages,
    route,
    session,
  }) {
    if (!session?.sessionToken) {
      return null;
    }

    if (suspendedRouteTypes.has(route?.type || '')) {
      return null;
    }

    if (route?.type === 'thread' && route.threadId) {
      return {
        intervalMs,
        key: `thread:${route.threadId}`,
        type: 'thread',
      };
    }

    if (route?.type === 'messages') {
      return {
        intervalMs,
        key: 'inbox',
        type: 'inbox',
      };
    }

    if (typeof refreshUnreadMessages === 'function') {
      return {
        intervalMs: counterIntervalMs,
        key: 'unread-counter',
        type: 'unread-counter',
      };
    }

    return null;
  }

  function scheduleNextRefresh(expectedGeneration) {
    clearScheduledRefresh();
    timerId = setTimeoutFn(async () => {
      timerId = null;

      if (expectedGeneration !== generation || !activeConfig || refreshInFlight) {
        return;
      }

      if (isDocumentHiddenFn()) {
        scheduleNextRefresh(expectedGeneration);
        return;
      }

      refreshInFlight = true;

      try {
        if (activeConfig.refreshTarget.type === 'thread' && activeConfig.route.threadId) {
          await activeConfig.refreshThread(activeConfig.route.threadId);
        } else if (activeConfig.refreshTarget.type === 'unread-counter') {
          await activeConfig.refreshUnreadMessages();
        } else {
          await activeConfig.refreshInbox();
        }
      } catch {
        // Keep polling after transient refresh/render failures.
      } finally {
        refreshInFlight = false;
      }

      if (expectedGeneration === generation && activeConfig) {
        scheduleNextRefresh(expectedGeneration);
      }
    }, activeIntervalMs);
  }

  return {
    stop,

    sync(config) {
      const refreshTarget = resolveRefreshTarget(config);

      if (!refreshTarget) {
        stop();
        return;
      }

      activeConfig = {
        ...config,
        refreshTarget,
      };
      activeIntervalMs = refreshTarget.intervalMs;

      if (refreshTarget.key !== activeKey) {
        generation += 1;
        activeKey = refreshTarget.key;
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
