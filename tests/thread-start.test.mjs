import assert from 'node:assert/strict';
import test from 'node:test';
import { createThreadStarter } from '../App/services/thread-start.mjs';

test('failure is visible and retry can succeed without a rejected promise', async () => {
  let fail = true;
  const starter = createThreadStarter({ createThread: async () => { if (fail) throw new Error('offline'); return { id: 'thread-1' }; } });
  assert.equal((await starter.start({})).status, 'error');
  assert.match(starter.state.error, /réessayez/i);
  assert.equal(starter.state.busy, false);
  fail = false;
  assert.equal((await starter.start({})).thread.id, 'thread-1');
  assert.equal(starter.state.error, '');
});
test('duplicate taps do not create a second thread', async () => {
  let resolve; let calls = 0;
  const starter = createThreadStarter({ createThread: () => { calls++; return new Promise(r => { resolve = r; }); } });
  const pending = starter.start({});
  assert.equal((await starter.start({})).status, 'busy');
  assert.equal(calls, 1); resolve({ id: 'thread-1' }); await pending;
});
test('expired session, required terms and malformed success have explicit outcomes', async () => {
  for (const [code, status] of [[401, 'auth-required'], [428, 'terms-required']]) {
    const starter = createThreadStarter({ createThread: async () => { throw Object.assign(new Error(), { status: code }); } });
    assert.equal((await starter.start({})).status, status);
    assert.ok(starter.state.error);
  }
  const starter = createThreadStarter({ createThread: async () => ({}) });
  assert.equal((await starter.start({})).status, 'error');
});
