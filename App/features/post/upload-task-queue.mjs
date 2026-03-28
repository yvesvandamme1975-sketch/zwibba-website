export function createUploadTaskQueue({
  onStateChange = () => {},
} = {}) {
  let pendingCount = 0;
  let tail = Promise.resolve();
  const pendingTokens = new Map();

  function notifyStateChange() {
    pendingCount = Array.from(pendingTokens.values()).filter(
      (token) => !token.cancelled || token.started,
    ).length;
    onStateChange({
      pendingCount,
    });
  }

  return {
    get pendingCount() {
      return pendingCount;
    },

    isBusy() {
      return pendingCount > 0;
    },

    run(task) {
      if (typeof task !== 'function') {
        throw new Error('An upload task function is required.');
      }

      const token = {
        cancelled: false,
        started: false,
      };

      const nextTask = tail
        .catch(() => {})
        .then(async () => {
          if (token.cancelled) {
            return undefined;
          }

          token.started = true;

          try {
            return await task();
          } finally {
            pendingTokens.delete(nextTask);
            notifyStateChange();
          }
        });

      pendingTokens.set(nextTask, token);
      notifyStateChange();
      tail = nextTask;
      return nextTask;
    },

    cancelAll() {
      let preserveCurrentTask = true;

      for (const token of pendingTokens.values()) {
        if (token.started || preserveCurrentTask) {
          preserveCurrentTask = false;
          continue;
        }

        token.cancelled = true;
      }

      notifyStateChange();
    },
  };
}
