import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captureScrollRenderState,
  restoreScrollRenderState,
} from '../App/utils/scroll-render-state.mjs';

test('captureScrollRenderState captures inner app scroll and page scroll', () => {
  const content = {
    scrollTop: 640,
  };
  const root = {
    querySelector(selector) {
      return selector === '.app-tab-shell__content' ? content : null;
    },
  };
  const win = {
    scrollY: 280,
  };

  assert.deepEqual(captureScrollRenderState(root, win), {
    contentScrollTop: 640,
    pageScrollY: 280,
  });
});

test('restoreScrollRenderState restores inner app scroll and page scroll', () => {
  const calls = [];
  const content = {
    scrollTop: 0,
  };
  const root = {
    querySelector(selector) {
      calls.push(['selector', selector]);
      return selector === '.app-tab-shell__content' ? content : null;
    },
  };
  const win = {
    scrollTo(x, y) {
      calls.push(['scrollTo', x, y]);
    },
  };

  restoreScrollRenderState(
    root,
    {
      contentScrollTop: 640,
      pageScrollY: 280,
    },
    win,
  );

  assert.equal(content.scrollTop, 640);
  assert.deepEqual(calls, [
    ['selector', '.app-tab-shell__content'],
    ['scrollTo', 0, 280],
  ]);
});

test('restoreScrollRenderState ignores missing captured state', () => {
  let queried = false;

  restoreScrollRenderState(
    {
      querySelector() {
        queried = true;
        return null;
      },
    },
    null,
    {
      scrollTo() {
        queried = true;
      },
    },
  );

  assert.equal(queried, false);
});
