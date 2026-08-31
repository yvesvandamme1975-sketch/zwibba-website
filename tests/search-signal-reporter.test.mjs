import assert from 'node:assert/strict';
import test from 'node:test';

import { createSearchSignalReporter } from '../App/utils/search-signal-reporter.mjs';

function createScheduler() {
  let pendingCallback = null;

  return {
    cancelFn(handle) {
      if (pendingCallback === handle) {
        pendingCallback = null;
      }
    },
    async flushPending() {
      const callback = pendingCallback;
      pendingCallback = null;
      await callback?.();
    },
    scheduleFn(callback) {
      pendingCallback = callback;
      return callback;
    },
  };
}

test('debounces rapid reports and sends only the last payload', async () => {
  const calls = [];
  const scheduler = createScheduler();
  const reporter = createSearchSignalReporter({
    reportFn: async (payload) => calls.push(payload),
    scheduleFn: scheduler.scheduleFn,
    cancelFn: scheduler.cancelFn,
  });

  reporter.report({ rawQuery: 'ci', selectedCategoryId: '', resultCount: 4 });
  reporter.report({ rawQuery: 'cim', selectedCategoryId: '', resultCount: 3 });
  reporter.report({ rawQuery: 'ciment', selectedCategoryId: '', resultCount: 2 });
  await scheduler.flushPending();

  assert.deepEqual(calls, [
    { rawQuery: 'ciment', selectedCategoryId: '', resultCount: 2 },
  ]);
});

test('does not report an empty search query', async () => {
  const calls = [];
  const scheduler = createScheduler();
  const reporter = createSearchSignalReporter({
    reportFn: async (payload) => calls.push(payload),
    scheduleFn: scheduler.scheduleFn,
    cancelFn: scheduler.cancelFn,
  });

  reporter.report({ rawQuery: '   ', selectedCategoryId: '', resultCount: 4 });
  await scheduler.flushPending();

  assert.equal(calls.length, 0);
});

test('does not report the same settled payload twice', async () => {
  const calls = [];
  const scheduler = createScheduler();
  const reporter = createSearchSignalReporter({
    reportFn: async (payload) => calls.push(payload),
    scheduleFn: scheduler.scheduleFn,
    cancelFn: scheduler.cancelFn,
  });
  const payload = {
    rawQuery: 'ciment',
    selectedCategoryId: 'construction',
    resultCount: 2,
  };

  reporter.report(payload);
  await scheduler.flushPending();
  reporter.report(payload);
  await scheduler.flushPending();

  assert.equal(calls.length, 1);
});

test('does not propagate a report failure', async () => {
  const scheduler = createScheduler();
  const reporter = createSearchSignalReporter({
    reportFn: async () => {
      throw new Error('network unavailable');
    },
    scheduleFn: scheduler.scheduleFn,
    cancelFn: scheduler.cancelFn,
  });

  reporter.report({ rawQuery: 'ciment', selectedCategoryId: '', resultCount: 1 });

  await assert.doesNotReject(() => scheduler.flushPending());
});
