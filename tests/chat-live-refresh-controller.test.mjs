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
      const [id, timer] = pending.entries().next().value ?? [];

      if (!id) {
        return false;
      }

      pending.delete(id);
      timer.callback();
      return true;
    },
    pendingDelays() {
      return [...pending.values()].map((timer) => timer.delay);
    },
    setTimeout(callback, delay) {
      const id = nextId;
      nextId += 1;
      pending.set(id, {
        callback,
        delay,
      });
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

test('thread refresh controller stays quiet on non-message app routes', async () => {
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

  assert.equal(timers.flushNext(), false);
  await Promise.resolve();
  assert.deepEqual(events, []);
});

test('thread refresh controller refreshes only unread message state on non-message app routes', async () => {
  const timers = createFakeTimers();
  const events = [];
  const controller = createChatLiveRefreshController({
    clearTimeoutFn: timers.clearTimeout,
    counterIntervalMs: 120,
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
    refreshUnreadMessages: async () => {
      events.push('unread');
    },
    route: {
      type: 'buy',
    },
    session: {
      sessionToken: 'session_live',
    },
  });

  assert.deepEqual(timers.pendingDelays(), [120]);
  assert.equal(timers.flushNext(), true);
  await Promise.resolve();
  assert.deepEqual(events, ['unread']);
});

test('thread refresh controller skips network refresh while the document is hidden', async () => {
  const timers = createFakeTimers();
  const events = [];
  let hidden = true;
  const controller = createChatLiveRefreshController({
    clearTimeoutFn: timers.clearTimeout,
    intervalMs: 10,
    isDocumentHiddenFn: () => hidden,
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
  assert.deepEqual(events, []);

  hidden = false;
  assert.equal(timers.flushNext(), true);
  await Promise.resolve();
  assert.deepEqual(events, ['inbox']);
});

test('thread refresh controller keeps polling after a refresh failure', async () => {
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
      if (events.length === 1) {
        throw new Error('temporary failure');
      }
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

  assert.equal(timers.flushNext(), true);
  await Promise.resolve();
  assert.deepEqual(events, ['inbox', 'inbox']);
});

test('thread refresh controller stops polling on capture, draft-edit, and profile routes', async () => {
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
      type: 'capture',
    },
    session: {
      sessionToken: 'session_live',
    },
  });

  assert.equal(timers.flushNext(), false);
  assert.deepEqual(events, []);

  controller.sync({
    refreshInbox: async () => {
      events.push('inbox');
    },
    refreshThread: async (threadId) => {
      events.push(`thread:${threadId}`);
    },
    route: {
      type: 'review',
    },
    session: {
      sessionToken: 'session_live',
    },
  });

  assert.equal(timers.flushNext(), false);
  assert.deepEqual(events, []);

  controller.sync({
    refreshInbox: async () => {
      events.push('inbox');
    },
    refreshThread: async (threadId) => {
      events.push(`thread:${threadId}`);
    },
    route: {
      type: 'profile',
    },
    session: {
      sessionToken: 'session_live',
    },
  });

  assert.equal(timers.flushNext(), false);
  assert.deepEqual(events, []);
});
