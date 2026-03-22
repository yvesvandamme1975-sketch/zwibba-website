import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createListingDraftFromFirstPhoto,
  markDraftOtpVerified,
} from '../App/models/listing-draft.mjs';
import {
  createDraftStorageService,
  createMemoryStorage,
} from '../App/services/draft-storage.mjs';

test('draft can be created from one photo', () => {
  const draft = createListingDraftFromFirstPhoto({
    photoUrl: '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.svg',
  });

  assert.equal(draft.photos.length, 1);
  assert.equal(draft.photos[0].url, '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.svg');
  assert.equal(draft.syncState, 'local_only');
  assert.equal(draft.canSyncToAccount, false);
});

test('draft survives app restart', () => {
  const storage = createMemoryStorage();
  const firstSession = createDraftStorageService({ storage });
  const initialDraft = createListingDraftFromFirstPhoto({
    photoUrl: '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.svg',
  });

  firstSession.saveDraft(initialDraft);

  const secondSession = createDraftStorageService({ storage });
  const restoredDraft = secondSession.loadDraft();

  assert.equal(restoredDraft.id, initialDraft.id);
  assert.deepEqual(restoredDraft.photos, initialDraft.photos);
  assert.equal(restoredDraft.syncState, 'local_only');
});

test('otp state changes a draft from local-only to account-syncable', () => {
  const draft = createListingDraftFromFirstPhoto({
    photoUrl: '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.svg',
  });

  const updatedDraft = markDraftOtpVerified(draft, {
    phoneNumber: '+243990000001',
  });

  assert.equal(updatedDraft.syncState, 'account_syncable');
  assert.equal(updatedDraft.canSyncToAccount, true);
  assert.equal(updatedDraft.auth.phoneNumber, '+243990000001');
});
