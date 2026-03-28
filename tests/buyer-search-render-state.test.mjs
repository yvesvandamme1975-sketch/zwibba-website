import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captureBuyerSearchRenderState,
  restoreBuyerSearchRenderState,
} from '../App/utils/buyer-search-render-state.mjs';

test('captureBuyerSearchRenderState captures buyer search focus and selection', () => {
  const activeElement = {
    name: 'buyerSearch',
    selectionEnd: 5,
    selectionStart: 2,
    value: 'samsu',
  };

  assert.deepEqual(captureBuyerSearchRenderState(activeElement), {
    name: 'buyerSearch',
    selectionEnd: 5,
    selectionStart: 2,
    value: 'samsu',
  });
});

test('captureBuyerSearchRenderState ignores unrelated active elements', () => {
  assert.equal(captureBuyerSearchRenderState({ name: 'threadMessage' }), null);
  assert.equal(captureBuyerSearchRenderState(null), null);
});

test('restoreBuyerSearchRenderState refocuses the rerendered search input and restores the caret', () => {
  const calls = [];
  const nextInput = {
    focus() {
      calls.push('focus');
    },
    setSelectionRange(start, end) {
      calls.push(['selection', start, end]);
    },
    value: 'samsung',
  };
  const root = {
    querySelector(selector) {
      calls.push(['selector', selector]);
      return nextInput;
    },
  };

  restoreBuyerSearchRenderState(root, {
    name: 'buyerSearch',
    selectionEnd: 4,
    selectionStart: 4,
    value: 'samsung',
  });

  assert.deepEqual(calls, [
    ['selector', 'input[name="buyerSearch"]'],
    'focus',
    ['selection', 4, 4],
  ]);
});

test('restoreBuyerSearchRenderState does nothing when there is no captured state', () => {
  let queried = false;
  restoreBuyerSearchRenderState(
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
