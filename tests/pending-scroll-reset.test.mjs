import assert from 'node:assert/strict';
import test from 'node:test';

import { createPendingScrollResetController } from '../App/utils/pending-scroll-reset.mjs';

test('pending scroll reset returns a one-shot top reset for the requested route', () => {
  const pendingScrollReset = createPendingScrollResetController();

  pendingScrollReset.request('sell');

  assert.deepEqual(pendingScrollReset.consume('sell'), {
    contentScrollTop: 0,
    pageScrollY: 0,
  });
  assert.equal(pendingScrollReset.consume('sell'), null);
});

test('pending scroll reset waits for the matching route before consuming', () => {
  const pendingScrollReset = createPendingScrollResetController();

  pendingScrollReset.request('sell');

  assert.equal(pendingScrollReset.consume('buy'), null);
  assert.deepEqual(pendingScrollReset.consume('sell'), {
    contentScrollTop: 0,
    pageScrollY: 0,
  });
});
