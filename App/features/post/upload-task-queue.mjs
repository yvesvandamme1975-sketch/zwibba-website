export function createUploadTaskQueue() {
  let pendingCount = 0;
  let tail = Promise.resolve();

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

      const nextTask = tail
        .catch(() => {})
        .then(async () => {
          try {
            return await task();
          } finally {
            pendingCount -= 1;
          }
        });

      tail = nextTask;
      return nextTask;
    },
  };
}
