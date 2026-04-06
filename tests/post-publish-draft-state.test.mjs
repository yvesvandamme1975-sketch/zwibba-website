import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveDraftlessSellerRoute,
  shouldRetainDraftAfterPublish,
} from '../App/utils/post-publish-draft-state.mjs';

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

test('success route stays available after publish when post-publish state exists', () => {
  assert.equal(
    resolveDraftlessSellerRoute({
      routeType: 'success',
      publishedDraft: {
        details: {
          title: 'MacBook Pro 14',
        },
      },
      publishOutcome: null,
    }),
    'success',
  );

  assert.equal(
    resolveDraftlessSellerRoute({
      routeType: 'success',
      publishedDraft: null,
      publishOutcome: {
        status: 'approved',
      },
    }),
    'success',
  );
});

test('success route falls back to profile when post-publish state is gone', () => {
  assert.equal(
    resolveDraftlessSellerRoute({
      routeType: 'success',
      publishedDraft: null,
      publishOutcome: null,
    }),
    'profile',
  );
});

test('true draft-only routes still fall back to capture when no draft exists', () => {
  assert.equal(
    resolveDraftlessSellerRoute({
      routeType: 'review',
      publishedDraft: null,
      publishOutcome: null,
    }),
    'capture',
  );
});
