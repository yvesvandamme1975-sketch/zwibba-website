import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createListingDraftFromFirstPhoto,
  markDraftOtpVerified,
  updateListingDraft,
} from '../App/models/listing-draft.mjs';
import { submitLivePublish } from '../App/features/post/live-publish-flow.mjs';

function createJsonResponse(status, jsonValue) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get() {
        return 'application/json';
      },
    },
    async json() {
      return jsonValue;
    },
  };
}

function createBinaryResponse(bytes, contentType = 'image/jpeg') {
  return {
    ok: true,
    status: 200,
    headers: {
      get(name) {
        return name.toLowerCase() === 'content-type' ? contentType : null;
      },
    },
    async arrayBuffer() {
      return Uint8Array.from(bytes).buffer;
    },
  };
}

test('live publish uploads preview photos, syncs the draft, and returns the moderation outcome', async () => {
  const requests = [];
  const session = {
    canSyncDrafts: true,
    phoneNumber: '+243990000001',
    sessionToken: 'zwibba_session_live_123',
  };
  const draft = updateListingDraft(
    markDraftOtpVerified(
      createListingDraftFromFirstPhoto({
        photoUrl: '/uploads/phone-front.jpg',
      }),
      { phoneNumber: session.phoneNumber },
    ),
    {
      details: {
        area: 'Golf',
        categoryId: 'phones_tablets',
        condition: 'like_new',
        description: 'Téléphone propre, prêt à être récupéré aujourd’hui.',
        priceCdf: 450000,
        title: 'Samsung Galaxy A54',
      },
    },
  );

  const result = await submitLivePublish({
    apiBaseUrl: 'https://api.example.test',
    draft,
    fetchFn: async (url, options = {}) => {
      requests.push({
        url,
        ...options,
      });

      if (url === '/uploads/phone-front.jpg') {
        return createBinaryResponse([1, 2, 3, 4], 'image/jpeg');
      }

      if (url === 'https://api.example.test/media/upload-url') {
        return createJsonResponse(200, {
          objectKey: 'draft-photos/capture/photo_1-phone.jpg',
          photoId: 'photo_capture_1',
          publicUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
          sourcePresetId: 'capture',
          uploadUrl: 'https://uploads.example.test/signed-put',
        });
      }

      if (url === 'https://uploads.example.test/signed-put') {
        return {
          ok: true,
          status: 200,
          headers: {
            get() {
              return null;
            },
          },
        };
      }

      if (url === 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg') {
        return {
          ok: true,
          status: 200,
          headers: {
            get() {
              return 'image/jpeg';
            },
          },
        };
      }

      if (url === 'https://api.example.test/drafts/sync') {
        return createJsonResponse(200, {
          area: 'Golf',
          categoryId: 'phones_tablets',
          condition: 'like_new',
          description: 'Téléphone propre, prêt à être récupéré aujourd’hui.',
          draftId: 'draft_live_1',
          ownerPhoneNumber: '+243990000001',
          photos: [
            {
              objectKey: 'draft-photos/capture/photo_1-phone.jpg',
              photoId: 'photo_capture_1',
              publicUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
              sourcePresetId: 'capture',
              uploadStatus: 'uploaded',
            },
          ],
          priceCdf: 450000,
          syncStatus: 'synced',
          title: 'Samsung Galaxy A54',
        });
      }

      return createJsonResponse(200, {
        id: 'listing_live_1',
        listingSlug: 'samsung-galaxy-a54',
        reasonSummary: 'Annonce approuvée et prête à partager.',
        shareUrl: 'https://zwibba.com/annonces/samsung-galaxy-a54',
        status: 'approved',
        statusLabel: 'Annonce approuvée et prête à partager',
      });
    },
    session,
  });

  assert.equal(result.draft.remoteDraftId, 'draft_live_1');
  assert.equal(result.draft.photos[0].uploadStatus, 'uploaded');
  assert.equal(result.outcome.status, 'approved');
  assert.equal(result.listingUrl, 'https://zwibba.com/annonces/samsung-galaxy-a54');
  assert.equal(requests[0].url, '/uploads/phone-front.jpg');
  assert.equal(requests[1].url, 'https://api.example.test/media/upload-url');
  assert.equal(requests[2].url, 'https://uploads.example.test/signed-put');
  assert.equal(requests[3].url, 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg');
  assert.equal(requests[3].method, 'HEAD');
  assert.equal(requests[4].url, 'https://api.example.test/drafts/sync');
  assert.equal(requests[5].url, 'https://api.example.test/moderation/publish');
});

test('live publish stores missing preview fallbacks as svg uploads instead of broken jpg objects', async () => {
  const requests = [];
  const draft = updateListingDraft(
    createListingDraftFromFirstPhoto({
      photoUrl: '/assets/demo/face.jpg',
    }),
    {
      details: {
        area: 'Golf',
        categoryId: 'phones_tablets',
        condition: 'like_new',
        description: 'Téléphone propre, prêt à être récupéré.',
        priceCdf: 450000,
        title: 'Samsung Galaxy A54',
      },
    },
  );

  await submitLivePublish({
    apiBaseUrl: 'https://api.example.test',
    draft,
    fetchFn: async (url, options = {}) => {
      requests.push({
        url,
        ...options,
      });

      if (url === '/assets/demo/face.jpg') {
        return {
          ok: false,
          status: 404,
          headers: {
            get() {
              return null;
            },
          },
        };
      }

      if (url === 'https://api.example.test/media/upload-url') {
        assert.equal(
          options.body,
          JSON.stringify({
            contentType: 'image/svg+xml',
            fileName: 'face.svg',
            sourcePresetId: 'capture',
          }),
        );

        return createJsonResponse(200, {
          objectKey: 'draft-photos/capture/face.svg',
          photoId: 'photo_face_1',
          publicUrl: 'https://pub.example.test/draft-photos/capture/face.svg',
          sourcePresetId: 'capture',
          uploadUrl: 'https://uploads.example.test/signed-put',
        });
      }

      if (url === 'https://uploads.example.test/signed-put') {
        assert.ok(options.body.byteLength > 0);

        return {
          ok: true,
          status: 200,
          headers: {
            get() {
              return null;
            },
          },
        };
      }

      if (url === 'https://api.example.test/drafts/sync') {
        return createJsonResponse(200, {
          area: 'Golf',
          categoryId: 'phones_tablets',
          condition: 'like_new',
          description: 'Téléphone propre, prêt à être récupéré.',
          draftId: 'draft_live_2',
          ownerPhoneNumber: '+243990000001',
          photos: [
            {
              objectKey: 'draft-photos/capture/face.svg',
              photoId: 'photo_face_1',
              publicUrl: 'https://pub.example.test/draft-photos/capture/face.svg',
              sourcePresetId: 'capture',
              uploadStatus: 'uploaded',
            },
          ],
          priceCdf: 450000,
          syncStatus: 'synced',
          title: 'Samsung Galaxy A54',
        });
      }

      return createJsonResponse(200, {
        id: 'listing_live_2',
        listingSlug: 'samsung-galaxy-a54',
        reasonSummary: 'Annonce approuvée et prête à partager.',
        shareUrl: 'https://zwibba.com/annonces/samsung-galaxy-a54',
        status: 'approved',
        statusLabel: 'Annonce approuvée et prête à partager',
      });
    },
    session: {
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_live_123',
    },
  });

  assert.equal(requests[0].url, 'https://api.example.test/media/upload-url');
  assert.equal(requests[1].url, 'https://uploads.example.test/signed-put');
});

test('live publish reuses already uploaded photos without fetching or uploading them again', async () => {
  const requests = [];
  const result = await submitLivePublish({
    apiBaseUrl: 'https://api.example.test',
    draft: updateListingDraft(
      markDraftOtpVerified(
        createListingDraftFromFirstPhoto({
          photoUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
          photo: {
            objectKey: 'draft-photos/capture/photo_1-phone.jpg',
            photoId: 'photo_capture_1',
            publicUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
            sourcePresetId: 'capture',
            uploadStatus: 'uploaded',
          },
        }),
        { phoneNumber: '+243990000001' },
      ),
      {
        details: {
          area: 'Golf',
          categoryId: 'phones_tablets',
          condition: 'like_new',
          description: 'Téléphone déjà envoyé dans le brouillon.',
          priceCdf: 450000,
          title: 'Samsung Galaxy A54',
        },
      },
    ),
    fetchFn: async (url, options = {}) => {
      requests.push({
        url,
        ...options,
      });

      if (url === 'https://api.example.test/drafts/sync') {
        return createJsonResponse(200, {
          area: 'Golf',
          categoryId: 'phones_tablets',
          condition: 'like_new',
          description: 'Téléphone déjà envoyé dans le brouillon.',
          draftId: 'draft_live_3',
          ownerPhoneNumber: '+243990000001',
          photos: [
            {
              objectKey: 'draft-photos/capture/photo_1-phone.jpg',
              photoId: 'photo_capture_1',
              publicUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
              sourcePresetId: 'capture',
              uploadStatus: 'uploaded',
            },
          ],
          priceCdf: 450000,
          syncStatus: 'synced',
          title: 'Samsung Galaxy A54',
        });
      }

      return createJsonResponse(200, {
        id: 'listing_live_3',
        listingSlug: 'samsung-galaxy-a54',
        reasonSummary: 'Annonce approuvée et prête à partager.',
        shareUrl: 'https://zwibba.com/annonces/samsung-galaxy-a54',
        status: 'approved',
        statusLabel: 'Annonce approuvée et prête à partager',
      });
    },
    session: {
      canSyncDrafts: true,
      phoneNumber: '+243990000001',
      sessionToken: 'zwibba_session_live_123',
    },
  });

  assert.equal(result.draft.remoteDraftId, 'draft_live_3');
  assert.deepEqual(
    requests.map((request) => request.url),
    ['https://api.example.test/drafts/sync', 'https://api.example.test/moderation/publish'],
  );
});
