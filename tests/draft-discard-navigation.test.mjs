import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveDiscardDraftRoute } from '../App/utils/draft-discard-navigation.mjs';

test('discard stays on the current seller route when already on #sell', () => {
  assert.equal(resolveDiscardDraftRoute('#sell'), null);
});

test('discard routes back to #sell from other seller flow routes', () => {
  assert.equal(resolveDiscardDraftRoute('#review'), '#sell');
  assert.equal(resolveDiscardDraftRoute('#capture'), '#sell');
});
