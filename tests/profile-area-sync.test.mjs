import assert from 'node:assert/strict';
import test from 'node:test';

import { createReadyDraft } from '../App/features/post/post-flow-controller.mjs';
import { syncDraftAreaFromProfile } from '../App/utils/profile-area-sync.mjs';

test('syncDraftAreaFromProfile fills an empty draft area from the seller profile', () => {
  const draft = createReadyDraft({
    area: '',
  });

  const nextDraft = syncDraftAreaFromProfile(draft, 'Golf');

  assert.equal(nextDraft.details.area, 'Golf');
  assert.notEqual(nextDraft, draft);
});

test('syncDraftAreaFromProfile keeps an existing draft area untouched', () => {
  const draft = createReadyDraft({
    area: 'Bel Air',
  });

  const nextDraft = syncDraftAreaFromProfile(draft, 'Golf');

  assert.equal(nextDraft.details.area, 'Bel Air');
  assert.equal(nextDraft, draft);
});
