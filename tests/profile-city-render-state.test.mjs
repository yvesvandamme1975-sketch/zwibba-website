import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captureProfileCityRenderState,
  restoreProfileCityRenderState,
} from '../App/utils/profile-city-render-state.mjs';

test('captureProfileCityRenderState captures the active profile city field selection', () => {
  const activeElement = {
    name: 'areaSearch',
    selectionEnd: 3,
    selectionStart: 1,
    value: 'Likasi',
  };

  assert.deepEqual(captureProfileCityRenderState(activeElement), {
    name: 'areaSearch',
    selectionEnd: 3,
    selectionStart: 1,
    value: 'Likasi',
  });
});

test('captureProfileCityRenderState ignores unrelated active elements', () => {
  assert.equal(captureProfileCityRenderState({ name: 'buyerSearch' }), null);
  assert.equal(captureProfileCityRenderState(null), null);
});

test('restoreProfileCityRenderState refocuses the rerendered city input and restores the caret', () => {
  const restored = {
    focused: false,
    name: 'areaSearch',
    selection: null,
    setSelectionRange(start, end) {
      this.selection = {
        end,
        start,
      };
    },
    focus() {
      this.focused = true;
    },
  };
  const root = {
    querySelector(selector) {
      assert.equal(selector, 'input[name="areaSearch"]');
      return restored;
    },
  };

  restoreProfileCityRenderState(root, {
    name: 'areaSearch',
    selectionEnd: 4,
    selectionStart: 2,
  });

  assert.equal(restored.focused, true);
  assert.deepEqual(restored.selection, {
    end: 4,
    start: 2,
  });
});
