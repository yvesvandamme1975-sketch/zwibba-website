import assert from 'node:assert/strict';
import test from 'node:test';

import {
  captureReviewDraftRenderState,
  restoreReviewDraftRenderState,
} from '../App/utils/review-draft-render-state.mjs';

test('captureReviewDraftRenderState captures unsaved review field values and active field selection', () => {
  const form = {
    dataset: {
      form: 'review-draft',
    },
    elements: [
      {
        name: 'title',
        tagName: 'INPUT',
        type: 'text',
        value: 'Canape 3 places',
      },
      {
        name: 'categoryId',
        tagName: 'SELECT',
        type: 'select-one',
        value: 'home_garden',
      },
      {
        name: 'condition',
        tagName: 'SELECT',
        type: 'select-one',
        value: 'used_good',
      },
      {
        name: 'priceCdf',
        tagName: 'INPUT',
        type: 'number',
        value: '425000',
        selectionStart: 6,
        selectionEnd: 6,
      },
      {
        name: 'description',
        tagName: 'TEXTAREA',
        type: 'textarea',
        value: 'Canape propre et confortable.',
      },
      {
        name: 'area',
        tagName: 'SELECT',
        type: 'select-one',
        value: 'Lubumbashi Centre',
      },
    ],
  };
  const activeElement = {
    form,
    name: 'priceCdf',
    tagName: 'INPUT',
    type: 'number',
    value: '425000',
    selectionStart: 6,
    selectionEnd: 6,
  };
  const root = {
    querySelector(selector) {
      return selector === 'form[data-form="review-draft"]' ? form : null;
    },
  };

  assert.deepEqual(captureReviewDraftRenderState(root, activeElement), {
    activeField: {
      name: 'priceCdf',
      selectionEnd: 6,
      selectionStart: 6,
    },
    formName: 'review-draft',
    values: {
      area: 'Lubumbashi Centre',
      categoryId: 'home_garden',
      condition: 'used_good',
      description: 'Canape propre et confortable.',
      priceCdf: '425000',
      title: 'Canape 3 places',
    },
  });
});

test('captureReviewDraftRenderState ignores elements outside the review draft form', () => {
  const form = {
    dataset: {
      form: 'review-draft',
    },
    elements: [
      {
        name: 'priceCdf',
        value: '425000',
      },
    ],
  };
  const root = {
    querySelector(selector) {
      return selector === 'form[data-form="review-draft"]' ? form : null;
    },
  };

  assert.deepEqual(
    captureReviewDraftRenderState(root, {
      form: {
        dataset: {
          form: 'thread-reply',
        },
        elements: [],
      },
      name: 'threadMessage',
      value: 'Bonjour',
    }),
    {
      activeField: null,
      formName: 'review-draft',
      values: {
        priceCdf: '425000',
      },
    },
  );
});

test('captureReviewDraftRenderState returns null when the review form is absent', () => {
  assert.equal(
    captureReviewDraftRenderState(
      {
        querySelector() {
          return null;
        },
      },
      {
        name: 'threadMessage',
        value: 'Bonjour',
      },
    ),
    null,
  );
});

test('restoreReviewDraftRenderState restores unsaved review values and refocuses the active field', () => {
  const calls = [];
  const fields = new Map([
    [
      'title',
      {
        value: '',
      },
    ],
    [
      'categoryId',
      {
        value: '',
      },
    ],
    [
      'condition',
      {
        value: '',
      },
    ],
    [
      'priceCdf',
      {
        value: '',
        focus() {
          calls.push('focus');
        },
        setSelectionRange(start, end) {
          calls.push(['selection', start, end]);
        },
      },
    ],
    [
      'description',
      {
        value: '',
      },
    ],
    [
      'area',
      {
        value: '',
      },
    ],
  ]);
  const form = {
    querySelector(selector) {
      const match = selector.match(/\[name=\"(.+)\"\]/);
      calls.push(['selector', selector]);
      return match ? fields.get(match[1]) ?? null : null;
    },
  };
  const root = {
    querySelector(selector) {
      calls.push(['root', selector]);
      if (selector === 'form[data-form="review-draft"]') {
        return form;
      }

      return null;
    },
  };

  restoreReviewDraftRenderState(root, {
    activeField: {
      name: 'priceCdf',
      selectionEnd: 6,
      selectionStart: 6,
    },
    formName: 'review-draft',
    values: {
      area: 'Lubumbashi Centre',
      categoryId: 'home_garden',
      condition: 'used_good',
      description: 'Canape propre et confortable.',
      priceCdf: '425000',
      title: 'Canape 3 places',
    },
  });

  assert.equal(fields.get('title').value, 'Canape 3 places');
  assert.equal(fields.get('categoryId').value, 'home_garden');
  assert.equal(fields.get('condition').value, 'used_good');
  assert.equal(fields.get('priceCdf').value, '425000');
  assert.equal(fields.get('description').value, 'Canape propre et confortable.');
  assert.equal(fields.get('area').value, 'Lubumbashi Centre');
  assert.deepEqual(calls.slice(-3), [
    ['selector', '[name="priceCdf"]'],
    'focus',
    ['selection', 6, 6],
  ]);
});
