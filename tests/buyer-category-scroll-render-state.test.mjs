import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captureBuyerCategoryScrollRenderState,
  restoreBuyerCategoryScrollRenderState,
} from '../App/utils/buyer-category-scroll-render-state.mjs';

test('captureBuyerCategoryScrollRenderState captures the horizontal chip rail position', () => {
  const row = {
    scrollLeft: 184,
  };
  const root = {
    querySelector(selector) {
      return selector === '.app-home__chip-row' ? row : null;
    },
  };

  assert.deepEqual(captureBuyerCategoryScrollRenderState(root), {
    scrollLeft: 184,
  });
});

test('restoreBuyerCategoryScrollRenderState restores the horizontal chip rail position', () => {
  const row = {
    scrollLeft: 0,
  };
  const root = {
    querySelector(selector) {
      return selector === '.app-home__chip-row' ? row : null;
    },
  };

  restoreBuyerCategoryScrollRenderState(root, {
    scrollLeft: 184,
  });

  assert.equal(row.scrollLeft, 184);
});

test('restoreBuyerCategoryScrollRenderState ignores missing captured state', () => {
  let queried = false;

  restoreBuyerCategoryScrollRenderState(
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
