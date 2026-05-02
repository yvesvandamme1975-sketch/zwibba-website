import assert from 'node:assert/strict';
import test from 'node:test';

import { createListingDraftFromFirstPhoto } from '../App/models/listing-draft.mjs';
import { createApiConfig } from '../App/services/api-config.mjs';
import { createAuthService } from '../App/services/auth-service.mjs';
import { createMemoryStorage } from '../App/services/draft-storage.mjs';
import { createLiveDraftService } from '../App/services/live-draft-service.mjs';
import { createMediaService } from '../App/services/media-service.mjs';

function createJsonResponse(status, jsonValue) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return jsonValue;
    },
  };
}

test('api config falls back to the live Railway API base URL', () => {
  const config = createApiConfig({
    globalObject: {},
  });

  assert.equal(config.apiBaseUrl, 'https://api-production-b1b58.up.railway.app');
});

test('api config respects an injected browser override', () => {
  const config = createApiConfig({
    globalObject: {
      ZWIBBA_API_BASE_URL: 'https://example.test',
    },
  });

  assert.equal(config.apiBaseUrl, 'https://example.test');
});

test('live auth service requests OTP and persists the pending challenge', async () => {
  const requests = [];
  const authService = createAuthService({
    storage: createMemoryStorage(),
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options = {}) => {
      requests.push({
        url,
        ...options,
      });

      return createJsonResponse(200, {
        challengeId: 'verify_123',
        expiresInSeconds: 300,
        phoneNumber: '+243990000001',
      });
    },
  });

  const challenge = await authService.requestOtp({
    phoneNumber: '+243990000001',
  });

  assert.equal(challenge.challengeId, 'verify_123');
  assert.equal(authService.getPendingChallenge().phoneNumber, '+243990000001');
  assert.deepEqual(requests, [
    {
      url: 'https://api.example.test/auth/request-otp',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: '+243990000001',
      }),
    },
  ]);
});

test('live auth service verifies OTP and persists the returned session token', async () => {
  const authService = createAuthService({
    storage: createMemoryStorage(),
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options = {}) => {
      if (url.endsWith('/auth/request-otp')) {
        return createJsonResponse(200, {
          challengeId: 'verify_123',
          expiresInSeconds: 300,
          phoneNumber: '+243990000001',
        });
      }

      assert.equal(url, 'https://api.example.test/auth/verify-otp');
      assert.equal(options.method, 'POST');

      return createJsonResponse(200, {
        canSyncDrafts: true,
        phoneNumber: '+243990000001',
        sessionToken: 'zwibba_session_live_123',
      });
    },
  });

  await authService.requestOtp({
    phoneNumber: '+243990000001',
  });

  const session = await authService.verifyOtp({
    code: '123456',
  });

  assert.equal(session.sessionToken, 'zwibba_session_live_123');
  assert.equal(session.canSyncDrafts, true);
  assert.equal(authService.loadSession().sessionToken, 'zwibba_session_live_123');
  assert.equal(authService.getPendingChallenge(), null);
});

test('media service requests a signed upload URL and uploads bytes with PUT', async () => {
  const requests = [];
  const mediaService = createMediaService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options = {}) => {
      requests.push({
        url,
        ...options,
      });

      if (url === 'https://api.example.test/media/upload-url') {
        return createJsonResponse(200, {
          objectKey: 'draft-photos/capture/photo_1-phone.jpg',
          photoId: 'photo_capture_1',
          publicUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
          sourcePresetId: 'capture',
          uploadUrl: 'https://uploads.example.test/signed-put',
        });
      }

      return {
        ok: true,
        status: 200,
        async text() {
          return '';
        },
      };
    },
  });

  const slot = await mediaService.requestUploadSlot({
    contentType: 'image/jpeg',
    fileName: 'phone-front.jpg',
    sourcePresetId: 'capture',
  });

  await mediaService.uploadBytes({
    bytes: new Uint8Array([1, 2, 3, 4]),
    contentType: 'image/jpeg',
    publicUrl: slot.publicUrl,
    uploadUrl: slot.uploadUrl,
  });

  assert.equal(slot.objectKey, 'draft-photos/capture/photo_1-phone.jpg');
  assert.deepEqual(requests, [
    {
      url: 'https://api.example.test/media/upload-url',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        contentType: 'image/jpeg',
        fileName: 'phone-front.jpg',
        sourcePresetId: 'capture',
      }),
    },
    {
      url: 'https://uploads.example.test/signed-put',
      method: 'PUT',
      headers: {
        'content-type': 'image/jpeg',
      },
      body: new Uint8Array([1, 2, 3, 4]),
    },
    {
      url: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
      method: 'HEAD',
      cache: 'no-store',
    },
  ]);
});

test('media service fails when the public upload cannot be verified', async () => {
  const mediaService = createMediaService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url) => {
      if (url === 'https://uploads.example.test/signed-put') {
        return {
          ok: true,
          status: 200,
        };
      }

      return {
        ok: false,
        status: 404,
      };
    },
  });

  await assert.rejects(
    () =>
      mediaService.uploadBytes({
        bytes: new Uint8Array([1, 2, 3, 4]),
        contentType: 'image/jpeg',
        publicUrl: 'https://pub.example.test/missing.jpg',
        uploadUrl: 'https://uploads.example.test/signed-put',
      }),
    /Impossible de vérifier la photo téléversée\./,
  );
});

test('media service can discard uploaded draft objects by object key', async () => {
  const requests = [];
  const mediaService = createMediaService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options = {}) => {
      requests.push({
        url,
        ...options,
      });

      return createJsonResponse(200, {
        deletedCount: 2,
        status: 'deleted',
      });
    },
  });

  const result = await mediaService.deleteUploadedObjects({
    objectKeys: ['draft-photos/capture/photo_1.jpg', 'draft-photos/face/photo_2.jpg'],
  });

  assert.deepEqual(result, {
    deletedCount: 2,
    status: 'deleted',
  });
  assert.deepEqual(requests, [
    {
      url: 'https://api.example.test/media/discard-uploaded',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        objectKeys: ['draft-photos/capture/photo_1.jpg', 'draft-photos/face/photo_2.jpg'],
      }),
    },
  ]);
});

test('live draft service syncs and publishes with the seller bearer token', async () => {
  const requests = [];
  const draftService = createLiveDraftService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options = {}) => {
      requests.push({
        url,
        ...options,
      });

      if (url.endsWith('/drafts/sync')) {
        return createJsonResponse(200, {
          area: 'Golf',
          attributesJson: {
            fashion: {
              itemType: 'shoes',
              size: '39',
            },
          },
          categoryId: 'phones_tablets',
          condition: 'like_new',
          description: 'Téléphone complet, prêt à être récupéré.',
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
  });
  const draft = createListingDraftFromFirstPhoto({
    photoUrl: '/assets/demo/phone-front.jpg',
  });
  const session = {
    canSyncDrafts: true,
    phoneNumber: '+243990000001',
    sessionToken: 'zwibba_session_live_123',
  };

  const syncedDraft = await draftService.syncDraft({
    draft: {
      ...draft,
      details: {
        ...draft.details,
        area: 'Golf',
        attributesJson: {
          fashion: {
            itemType: 'shoes',
            size: '39',
          },
        },
        categoryId: 'phones_tablets',
        condition: 'like_new',
        description: 'Téléphone complet, prêt à être récupéré.',
        priceCdf: 450000,
        title: 'Samsung Galaxy A54',
      },
      photos: [
        {
          ...draft.photos[0],
          objectKey: 'draft-photos/capture/photo_1-phone.jpg',
          photoId: 'photo_capture_1',
          publicUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
          sourcePresetId: 'capture',
          uploadStatus: 'uploaded',
        },
      ],
    },
    session,
  });

  const publishOutcome = await draftService.publishDraft({
    draft: syncedDraft,
    session,
  });

  assert.equal(syncedDraft.remoteDraftId, 'draft_live_1');
  assert.deepEqual(syncedDraft.details.attributesJson, {
    fashion: {
      itemType: 'shoes',
      size: '39',
    },
  });
  assert.equal(publishOutcome.listingSlug, 'samsung-galaxy-a54');
  assert.equal(requests[0].headers.authorization, 'Bearer zwibba_session_live_123');
  assert.equal(requests[1].headers.authorization, 'Bearer zwibba_session_live_123');
  assert.match(String(requests[0].body), /"attributesJson"/);
});

test('live draft service deletes a seller draft with the bearer token', async () => {
  const requests = [];
  const draftService = createLiveDraftService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options = {}) => {
      requests.push({
        url,
        ...options,
      });

      return createJsonResponse(200, {
        draftId: 'draft_live_1',
        status: 'deleted',
      });
    },
  });
  const session = {
    canSyncDrafts: true,
    phoneNumber: '+243990000001',
    sessionToken: 'zwibba_session_live_123',
  };

  const result = await draftService.deleteDraft({
    draftId: 'draft_live_1',
    session,
  });

  assert.deepEqual(result, {
    draftId: 'draft_live_1',
    status: 'deleted',
  });
  assert.deepEqual(requests, [
    {
      url: 'https://api.example.test/drafts/draft_live_1',
      method: 'DELETE',
      headers: {
        authorization: 'Bearer zwibba_session_live_123',
      },
    },
  ]);
});
