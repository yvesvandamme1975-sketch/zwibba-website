import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captureThreadComposerRenderState,
  restoreThreadComposerRenderState,
} from '../App/utils/thread-composer-render-state.mjs';

test('captureThreadComposerRenderState captures the active message field selection', () => {
  const activeElement = {
    name: 'threadMessage',
    selectionEnd: 7,
    selectionStart: 7,
    value: 'bonjour',
  };

  assert.deepEqual(captureThreadComposerRenderState(activeElement), {
    name: 'threadMessage',
    selectionEnd: 7,
    selectionStart: 7,
    value: 'bonjour',
  });
});

test('captureThreadComposerRenderState ignores unrelated active elements', () => {
  assert.equal(captureThreadComposerRenderState({ name: 'buyerSearch' }), null);
  assert.equal(captureThreadComposerRenderState(null), null);
});

test('restoreThreadComposerRenderState refocuses the rerendered message input and restores the caret', () => {
  const calls = [];
  const nextInput = {
    focus() {
      calls.push('focus');
    },
    setSelectionRange(start, end) {
      calls.push(['selection', start, end]);
    },
    value: 'bonjour',
  };
  const root = {
    querySelector(selector) {
      calls.push(['selector', selector]);
      return nextInput;
    },
  };

  restoreThreadComposerRenderState(root, {
    name: 'threadMessage',
    selectionEnd: 7,
    selectionStart: 7,
    value: 'bonjour',
  });

  assert.deepEqual(calls, [
    ['selector', 'input[name="threadMessage"]'],
    'focus',
    ['selection', 7, 7],
  ]);
});

test('restoreThreadComposerRenderState does nothing when there is no captured state', () => {
  let queried = false;
  restoreThreadComposerRenderState(
    {
      querySelector() {
        queried = true;
        return null;
      },
    },
    null,
  );

  assert.equal(queried, false);
});
