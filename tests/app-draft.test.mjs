import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEditableListingDraft,
  createListingDraftFromFirstPhoto,
  markDraftOtpVerified,
  updateListingDraft,
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

test('price currency fallback resolves to EUR for a Belgian session instead of corrupting to CDF', () => {
  const draft = createListingDraftFromFirstPhoto({
    photoUrl: '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.svg',
  });
  const belgianDraft = markDraftOtpVerified(draft, {
    phoneNumber: '+32499000001',
  });

  const priced = updateListingDraft(belgianDraft, {
    details: {
      priceAmount: 250,
    },
  });

  assert.equal(priced.details.priceAmount, 250);
  assert.equal(priced.details.priceCurrency, 'EUR');
});

test('price currency fallback keeps defaulting to CDF when no phone context exists', () => {
  const draft = createListingDraftFromFirstPhoto({
    photoUrl: '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.svg',
  });

  const priced = updateListingDraft(draft, {
    details: {
      priceAmount: 450000,
    },
  });

  assert.equal(priced.details.priceAmount, 450000);
  assert.equal(priced.details.priceCurrency, 'CDF');
});

test('editing a published listing without an explicit currency defaults per the seller market', () => {
  const belgianEdit = createEditableListingDraft(
    {
      area: 'Bruxelles',
      priceAmount: 250,
      title: 'Vélo électrique',
    },
    { phoneNumber: '+32499000001' },
  );

  assert.equal(belgianEdit.details.priceCurrency, 'EUR');

  const congoleseEdit = createEditableListingDraft(
    {
      area: 'Gombe',
      priceAmount: 450000,
      title: 'Samsung Galaxy A54',
    },
    { phoneNumber: '+243990000001' },
  );

  assert.equal(congoleseEdit.details.priceCurrency, 'CDF');
});
