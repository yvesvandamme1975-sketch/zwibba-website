import assert from 'node:assert/strict';
import test from 'node:test';

import { createChatLiveRefreshController } from '../App/features/chat/chat-live-refresh-controller.mjs';

function createFakeTimers() {
  let nextId = 1;
  const pending = new Map();

  return {
    clearTimeout(id) {
      pending.delete(id);
    },
    flushNext() {
      const [id, callback] = pending.entries().next().value ?? [];

      if (!id) {
        return false;
      }

      pending.delete(id);
      callback();
      return true;
    },
    setTimeout(callback) {
      const id = nextId;
      nextId += 1;
      pending.set(id, callback);
      return id;
    },
  };
}

test('thread refresh controller polls the open thread until stopped', async () => {
  const timers = createFakeTimers();
  const events = [];
  const controller = createChatLiveRefreshController({
    clearTimeoutFn: timers.clearTimeout,
    intervalMs: 10,
    setTimeoutFn: timers.setTimeout,
  });

  controller.sync({
    refreshInbox: async () => {
      events.push('inbox');
    },
    refreshThread: async (threadId) => {
      events.push(`thread:${threadId}`);
    },
    route: {
      threadId: 'thread_123',
      type: 'thread',
    },
    session: {
      sessionToken: 'session_live',
    },
  });

  assert.equal(timers.flushNext(), true);
  await Promise.resolve();
  assert.deepEqual(events, ['thread:thread_123']);

  assert.equal(timers.flushNext(), true);
  await Promise.resolve();
  assert.deepEqual(events, ['thread:thread_123', 'thread:thread_123']);

  controller.stop();
  assert.equal(timers.flushNext(), false);
});

test('thread refresh controller switches to inbox polling on the messages route', async () => {
  const timers = createFakeTimers();
  const events = [];
  const controller = createChatLiveRefreshController({
    clearTimeoutFn: timers.clearTimeout,
    intervalMs: 10,
    setTimeoutFn: timers.setTimeout,
  });

  controller.sync({
    refreshInbox: async () => {
      events.push('inbox');
    },
    refreshThread: async (threadId) => {
      events.push(`thread:${threadId}`);
    },
    route: {
      type: 'messages',
    },
    session: {
      sessionToken: 'session_live',
    },
  });

  assert.equal(timers.flushNext(), true);
  await Promise.resolve();
  assert.deepEqual(events, ['inbox']);
});

test('thread refresh controller also polls inbox on non-thread app routes', async () => {
  const timers = createFakeTimers();
  const events = [];
  const controller = createChatLiveRefreshController({
    clearTimeoutFn: timers.clearTimeout,
    intervalMs: 10,
    setTimeoutFn: timers.setTimeout,
  });

  controller.sync({
    refreshInbox: async () => {
      events.push('inbox');
    },
    refreshThread: async (threadId) => {
      events.push(`thread:${threadId}`);
    },
    route: {
      type: 'buy',
    },
    session: {
      sessionToken: 'session_live',
    },
  });

  assert.equal(timers.flushNext(), true);
  await Promise.resolve();
  assert.deepEqual(events, ['inbox']);
});
