import assert from 'node:assert/strict';
import test from 'node:test';

import { createUploadTaskQueue } from '../App/features/post/upload-task-queue.mjs';

test('upload task queue runs photo uploads one at a time in submission order', async () => {
  const queue = createUploadTaskQueue();
  const events = [];

  const firstTask = queue.run(async () => {
    events.push('first:start');
    await new Promise((resolve) => setTimeout(resolve, 20));
    events.push('first:end');
    return 'first';
  });

  const secondTask = queue.run(async () => {
    events.push('second:start');
    events.push(`second:pending:${queue.pendingCount}`);
    events.push('second:end');
    return 'second';
  });

  assert.equal(queue.pendingCount, 2);
  assert.equal(queue.isBusy(), true);

  const results = await Promise.all([firstTask, secondTask]);

  assert.deepEqual(results, ['first', 'second']);
  assert.deepEqual(events, [
    'first:start',
    'first:end',
    'second:start',
    'second:pending:1',
    'second:end',
  ]);
  assert.equal(queue.pendingCount, 0);
  assert.equal(queue.isBusy(), false);
});

test('upload task queue notifies when pending work starts and finishes', async () => {
  const notifications = [];
  const queue = createUploadTaskQueue({
    onStateChange({ pendingCount }) {
      notifications.push(pendingCount);
    },
  });

  await queue.run(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
  });

  assert.deepEqual(notifications, [1, 0]);
});

test('upload task queue can cancel all queued work before it starts', async () => {
  const events = [];
  let releaseFirstTask;
  const firstTaskDone = new Promise((resolve) => {
    releaseFirstTask = resolve;
  });
  const queue = createUploadTaskQueue();

  const firstTask = queue.run(async () => {
    events.push('first:start');
    await firstTaskDone;
    events.push('first:end');
    return 'first';
  });

  const secondTask = queue.run(async () => {
    events.push('second:start');
    return 'second';
  });

  queue.cancelAll();
  releaseFirstTask();

  const results = await Promise.all([firstTask, secondTask]);

  assert.deepEqual(results, ['first', undefined]);
  assert.deepEqual(events, ['first:start', 'first:end']);
  assert.equal(queue.pendingCount, 0);
});
