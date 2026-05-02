import assert from 'node:assert/strict';
import test from 'node:test';

import * as listingDraftModel from '../App/models/listing-draft.mjs';

test('listing draft model exposes a helper to rehydrate a published listing into an editable draft', () => {
  assert.equal(typeof listingDraftModel.createEditableListingDraft, 'function');
});

test('createEditableListingDraft rebuilds a synced seller draft from owner listing detail metadata', () => {
  const now = '2026-04-11T12:00:00.000Z';
  const draft = listingDraftModel.createEditableListingDraft({
    area: 'Lubumbashi Centre',
    attributesJson: {
      fashion: {
        itemType: 'shoes',
        size: '39',
      },
    },
    categoryId: 'electronics',
    condition: 'used_good',
    description: 'Piano numérique en bon état.',
    draftId: 'draft_listing_1',
    ownerPhoneNumber: '+243990000001',
    photos: [
      {
        objectKey: 'draft-photos/piano-primary.jpg',
        photoId: 'photo_piano_primary',
        publicUrl: 'https://pub.example.test/draft-photos/piano-primary.jpg',
        sourcePresetId: 'capture',
        uploadStatus: 'uploaded',
      },
      {
        objectKey: 'draft-photos/piano-side.jpg',
        photoId: 'photo_piano_side',
        publicUrl: 'https://pub.example.test/draft-photos/piano-side.jpg',
        sourcePresetId: 'vue_ensemble',
        uploadStatus: 'uploaded',
      },
    ],
    priceAmount: 250,
    priceCurrency: 'USD',
    title: 'Piano numérique Korg',
  }, {
    now,
    phoneNumber: '+243990000001',
  });

  assert.equal(draft.remoteDraftId, 'draft_listing_1');
  assert.equal(draft.syncStatus, 'synced');
  assert.equal(draft.canSyncToAccount, true);
  assert.equal(draft.ownerPhoneNumber, '+243990000001');
  assert.equal(draft.auth.phoneNumber, '+243990000001');
  assert.equal(draft.auth.otpVerified, true);
  assert.equal(draft.details.title, 'Piano numérique Korg');
  assert.equal(draft.details.categoryId, 'electronics');
  assert.equal(draft.details.condition, 'used_good');
  assert.equal(draft.details.description, 'Piano numérique en bon état.');
  assert.equal(draft.details.area, 'Lubumbashi Centre');
  assert.deepEqual(draft.details.attributesJson, {
    fashion: {
      itemType: 'shoes',
      size: '39',
    },
  });
  assert.equal(draft.details.priceAmount, 250);
  assert.equal(draft.details.priceCurrency, 'USD');
  assert.equal(draft.photos.length, 2);
  assert.equal(draft.photos[0].kind, 'primary');
  assert.equal(draft.photos[0].photoId, 'photo_piano_primary');
  assert.equal(draft.photos[0].objectKey, 'draft-photos/piano-primary.jpg');
  assert.equal(draft.photos[0].publicUrl, 'https://pub.example.test/draft-photos/piano-primary.jpg');
  assert.equal(draft.photos[0].uploadStatus, 'uploaded');
  assert.equal(draft.photos[1].kind, 'guided');
  assert.equal(draft.photos[1].promptId, 'vue_ensemble');
  assert.equal(draft.ai.status, 'manual_fallback');
  assert.match(draft.ai.message, /modifiez une annonce déjà publiée/i);
  assert.equal(draft.updatedAt, now);
});
