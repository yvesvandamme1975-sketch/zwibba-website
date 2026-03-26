export function createUploadTaskQueue({
  onStateChange = () => {},
} = {}) {
  let pendingCount = 0;
  let tail = Promise.resolve();

  function notifyStateChange() {
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

      pendingCount += 1;
      notifyStateChange();

      const nextTask = tail
        .catch(() => {})
        .then(async () => {
          try {
            return await task();
          } finally {
            pendingCount -= 1;
            notifyStateChange();
          }
        });

      tail = nextTask;
      return nextTask;
    },
  };
}
