import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldRetainDraftAfterPublish } from '../App/utils/post-publish-draft-state.mjs';

test('approved listings clear the seller draft so a new annonce can start', () => {
  assert.equal(
    shouldRetainDraftAfterPublish({
      status: 'approved',
    }),
    false,
  );
});

test('pending manual review also clears the seller draft', () => {
  assert.equal(
    shouldRetainDraftAfterPublish({
      status: 'pending_manual_review',
    }),
    false,
  );
});

test('blocked listings keep the seller draft for correction', () => {
  assert.equal(
    shouldRetainDraftAfterPublish({
      status: 'blocked_needs_fix',
    }),
    true,
  );
});
