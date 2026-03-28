import assert from 'node:assert/strict';
import test from 'node:test';

import { renderCaptureScreen } from '../App/features/post/capture-screen.mjs';
import { renderPhotoGuidanceScreen } from '../App/features/post/photo-guidance-screen.mjs';
import { renderReviewFormScreen } from '../App/features/post/review-form-screen.mjs';
import {
  MAX_PRICE_CDF,
  addGuidedPhotoToDraft,
  createPostFlowController,
  createReadyDraft,
  getMissingRequiredPhotoPrompts,
  validateDraftForPublish,
} from '../App/features/post/post-flow-controller.mjs';
import {
  createDraftStorageService,
  createMemoryStorage,
} from '../App/services/draft-storage.mjs';

function createAiDraftServiceMock(result) {
  const calls = [];
  return {
    calls,
    async generateDraft(photo) {
      calls.push(photo);
      return result;
    },
  };
}

function createImageCompressionServiceMock() {
  return {
    compressImage(fileOrPhoto, maybePhoto) {
      const photo = maybePhoto ?? fileOrPhoto;
      const normalizedPhoto = {
        ...photo,
        originalSizeBytes: photo.sizeBytes ?? photo.size ?? 0,
        sizeBytes: Math.min(photo.sizeBytes ?? photo.size ?? 0, 1_500_000),
        wasCompressed: (photo.sizeBytes ?? photo.size ?? 0) > 1_500_000,
      };

      if (!maybePhoto) {
        return normalizedPhoto;
      }

      return {
        photo: normalizedPhoto,
      };
    },
  };
}

function createMediaServiceMock({
  onUpload = async () => {},
  slot = {},
} = {}) {
  const requests = [];

  return {
    requests,
    async requestUploadSlot(payload) {
      requests.push({
        type: 'slot',
        payload,
      });

      return {
        objectKey: 'draft-photos/capture/photo_1-phone.jpg',
        photoId: 'photo_capture_1',
        publicUrl: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
        sourcePresetId: 'capture',
        uploadUrl: 'https://uploads.example.test/signed-put',
        ...slot,
      };
    },
    async uploadBytes(payload) {
      requests.push({
        type: 'upload',
        payload,
      });

      return onUpload(payload);
    },
  };
}

function createBrowserFile({
  bytes = [1, 2, 3, 4],
  name = 'phone-front.jpg',
  size = 3_400_000,
  type = 'image/jpeg',
} = {}) {
  return {
    name,
    size,
    type,
    async arrayBuffer() {
      return Uint8Array.from(bytes).buffer;
    },
  };
}

test('first real photo starts a draft and uploads immediately', async () => {
  const draftStorage = createDraftStorageService({
    storage: createMemoryStorage(),
  });
  const mediaService = createMediaServiceMock();
  const aiDraftService = createAiDraftServiceMock({
    status: 'ready',
    draftPatch: {
      categoryId: 'phones_tablets',
      title: 'Samsung Galaxy A54',
      condition: 'like_new',
      description: 'Téléphone propre avec boîte.',
      suggestedPriceMinCdf: 300_000,
      suggestedPriceMaxCdf: 360_000,
    },
  });
  const controller = createPostFlowController({
    draftStorage,
    imageCompressionService: createImageCompressionServiceMock(),
    aiDraftService,
    createPreviewUrl: (file) => `blob:${file.name}`,
    mediaService,
  });

  const draft = await controller.captureFirstPhoto(createBrowserFile());

  assert.equal(draft.photos.length, 1);
  assert.equal(draft.photos[0].previewUrl, 'blob:phone-front.jpg');
  assert.equal(
    draft.photos[0].url,
    'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
  );
  assert.equal(draft.photos[0].uploadStatus, 'uploaded');
  assert.equal(draft.photos[0].objectKey, 'draft-photos/capture/photo_1-phone.jpg');
  assert.equal(draft.details.categoryId, 'phones_tablets');
  assert.equal(draft.details.title, 'Samsung Galaxy A54');
  assert.equal(draft.details.condition, 'like_new');
  assert.equal(draft.details.description, 'Téléphone propre avec boîte.');
  assert.equal(draft.ai.applied, true);
  assert.equal('suggestedPriceMinCdf' in draft.details, false);
  assert.equal('suggestedPriceMaxCdf' in draft.details, false);
  assert.equal(aiDraftService.calls.length, 1);
  assert.equal(
    aiDraftService.calls[0].publicUrl,
    'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
  );
  assert.equal(aiDraftService.calls[0].objectKey, 'draft-photos/capture/photo_1-phone.jpg');
  assert.equal(draftStorage.loadDraft().id, draft.id);
  assert.deepEqual(mediaService.requests.map((request) => request.type), ['slot', 'upload']);
});

test('first photo upload uses the compressed bytes and normalized image metadata', async () => {
  const draftStorage = createDraftStorageService({
    storage: createMemoryStorage(),
  });
  const mediaService = createMediaServiceMock();
  const aiDraftService = createAiDraftServiceMock({
    status: 'manual_fallback',
    message: 'Continuez manuellement.',
  });
  const compressionRequests = [];
  const controller = createPostFlowController({
    draftStorage,
    imageCompressionService: {
      async compressImage(file, photo) {
        compressionRequests.push({
          file,
          photo,
        });

        return {
          photo: {
            ...photo,
            contentType: 'image/jpeg',
            fileName: 'phone-front-compressed.jpg',
            originalSizeBytes: 3_400_000,
            sizeBytes: 820_000,
            wasCompressed: true,
          },
          upload: {
            bytes: Uint8Array.from([9, 8, 7, 6]),
            contentType: 'image/jpeg',
            fileName: 'phone-front-compressed.jpg',
          },
        };
      },
    },
    aiDraftService,
    createPreviewUrl: (file) => `blob:${file.name}`,
    mediaService,
  });

  const draft = await controller.captureFirstPhoto(
    createBrowserFile({
      bytes: [1, 2, 3, 4],
      name: 'phone-front.heic',
      size: 3_400_000,
      type: 'image/heic',
    }),
  );

  assert.equal(compressionRequests.length, 1);
  assert.equal(draft.photos[0].contentType, 'image/jpeg');
  assert.equal(draft.photos[0].fileName, 'phone-front-compressed.jpg');
  assert.equal(draft.photos[0].sizeBytes, 820_000);
  assert.equal(draft.photos[0].originalSizeBytes, 3_400_000);
  assert.equal(draft.photos[0].uploadStatus, 'uploaded');
  assert.deepEqual(mediaService.requests[0], {
    type: 'slot',
    payload: {
      contentType: 'image/jpeg',
      fileName: 'phone-front-compressed.jpg',
      sourcePresetId: 'capture',
    },
  });
  assert.deepEqual(Array.from(mediaService.requests[1].payload.bytes), [9, 8, 7, 6]);
  assert.equal(mediaService.requests[1].payload.contentType, 'image/jpeg');
});

test('incomplete ready AI output falls back to manual mode instead of partially filling the draft', async () => {
  const draftStorage = createDraftStorageService({
    storage: createMemoryStorage(),
  });
  const controller = createPostFlowController({
    draftStorage,
    imageCompressionService: createImageCompressionServiceMock(),
    aiDraftService: createAiDraftServiceMock({
      status: 'ready',
      draftPatch: {
        categoryId: 'home_garden',
        condition: 'used_good',
        description: 'Gâteau visible sur la photo.',
        title: '',
      },
    }),
    createPreviewUrl: (file) => `blob:${file.name}`,
    mediaService: createMediaServiceMock({
      slot: {
        objectKey: 'draft-photos/capture/photo_1-cake.jpg',
        photoId: 'photo_capture_cake',
        publicUrl: 'https://pub.example.test/draft-photos/capture/photo_1-cake.jpg',
      },
    }),
  });

  const draft = await controller.captureFirstPhoto(
    createBrowserFile({
      name: 'cake.jpg',
      size: 1_200_000,
    }),
  );

  assert.equal(draft.ai.status, 'manual_fallback');
  assert.equal(draft.ai.applied, false);
  assert.equal(draft.details.title, '');
  assert.equal(draft.details.categoryId, '');
  assert.equal(draft.details.condition, '');
  assert.equal(draft.details.description, '');
});

test('AI category suggestion drives guided-photo prompts', async () => {
  const mediaService = createMediaServiceMock();
  const controller = createPostFlowController({
    draftStorage: createDraftStorageService({
      storage: createMemoryStorage(),
    }),
    imageCompressionService: createImageCompressionServiceMock(),
    aiDraftService: createAiDraftServiceMock({
      status: 'ready',
      draftPatch: {
        categoryId: 'phones_tablets',
        title: 'Samsung Galaxy A54',
        condition: 'like_new',
        description: 'Téléphone propre avec boîte.',
        suggestedPriceMinCdf: 300_000,
        suggestedPriceMaxCdf: 360_000,
      },
    }),
    createPreviewUrl: (file) => `blob:${file.name}`,
    mediaService,
  });

  const draft = await controller.captureFirstPhoto(
    createBrowserFile({
      name: 'phone-front.jpg',
      size: 2_200_000,
    }),
  );

  const html = renderPhotoGuidanceScreen({ draft });

  assert.match(html, /Face/);
  assert.match(html, /Dos/);
  assert.match(html, /Écran allumé/);
});

test('capture screen renders a real image picker instead of demo preset cards', () => {
  const html = renderCaptureScreen({
    busyLabel: '',
    draft: null,
  });

  assert.match(html, /\/assets\/brand\/favicon\.svg/);
  assert.match(html, /Zwibba/);
  assert.match(html, /type="file"/);
  assert.match(html, /accept="image\/\*"/);
  assert.match(html, /capture="environment"/);
  assert.doesNotMatch(html, /capture-demo-photo/);
  assert.doesNotMatch(html, /Téléphone premium/);
});

test('capture screen shows an abandon button when a draft already exists', () => {
  const html = renderCaptureScreen({
    busyLabel: '',
    draft: createReadyDraft(),
  });

  assert.match(html, /Abandonner mon brouillon/);
  assert.match(html, /data-action="discard-draft"/);
});

test('guided upload marks a required prompt complete only after upload succeeds', async () => {
  const draftStorage = createDraftStorageService({
    storage: createMemoryStorage(),
  });
  const mediaService = createMediaServiceMock({
    slot: {
      objectKey: 'draft-photos/face/photo_face.jpg',
      photoId: 'photo_face_1',
      publicUrl: 'https://pub.example.test/draft-photos/face/photo_face.jpg',
      sourcePresetId: 'face',
    },
  });
  const aiDraftService = createAiDraftServiceMock({
    status: 'ready',
    draftPatch: {
      categoryId: 'phones_tablets',
      title: 'Samsung Galaxy A54',
      condition: 'like_new',
      description: 'Téléphone propre avec boîte.',
    },
  });
  const controller = createPostFlowController({
    draftStorage,
    imageCompressionService: createImageCompressionServiceMock(),
    aiDraftService,
    createPreviewUrl: (file) => `blob:${file.name}`,
    mediaService,
  });

  const draft = await controller.captureFirstPhoto(createBrowserFile());
  const updatedDraft = await controller.addGuidedPhoto(
    'face',
    createBrowserFile({
      name: 'face.jpg',
      size: 850_000,
    }),
  );
  const missingPromptIds = getMissingRequiredPhotoPrompts(updatedDraft).map((prompt) => prompt.id);

  assert.ok(!missingPromptIds.includes('face'));
  assert.equal(updatedDraft.photos.find((photo) => photo.promptId === 'face')?.uploadStatus, 'uploaded');
  assert.equal(aiDraftService.calls.length, 1);
});

test('guidance screen disables continue while any guided photo upload is still running', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: 'phones_tablets',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:primary.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
        },
        {
          id: 'photo-2',
          kind: 'guided',
          promptId: 'face',
          previewUrl: 'blob:face.jpg',
          uploadStatus: 'uploading',
        },
      ],
    }),
  });

  assert.match(html, /Téléversement en cours/i);
  assert.doesNotMatch(html, /href="#review"/);
  assert.match(html, /Continuer vers le brouillon/);
  assert.match(html, /disabled/);
});

test('queued uploads also keep guidance locked until the queue is empty', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: 'phones_tablets',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:primary.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
        },
      ],
    }),
    uploadsBusy: true,
  });

  assert.doesNotMatch(html, /href="#review"/);
  assert.match(html, /disabled/);
});

test('guidance unlocks once all required uploads are complete and the queue is idle', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: 'phones_tablets',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:primary.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-phone.jpg',
        },
        {
          id: 'photo-2',
          kind: 'guided',
          promptId: 'face',
          previewUrl: 'blob:face.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/face/photo_face.jpg',
        },
        {
          id: 'photo-3',
          kind: 'guided',
          promptId: 'back',
          previewUrl: 'blob:back.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/back/photo_back.jpg',
        },
        {
          id: 'photo-4',
          kind: 'guided',
          promptId: 'screen_on',
          previewUrl: 'blob:screen.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/screen_on/photo_screen_on.jpg',
        },
      ],
    }),
    uploadsBusy: false,
  });

  assert.match(html, /href="#review"/);
  assert.doesNotMatch(html, /button[^>]+disabled/);
});

test('failed guided upload stays retryable and does not satisfy the required prompt', async () => {
  const draftStorage = createDraftStorageService({
    storage: createMemoryStorage(),
  });
  let uploadCount = 0;
  const mediaService = createMediaServiceMock({
    onUpload: async () => {
      uploadCount += 1;

      if (uploadCount === 1) {
        return;
      }

      throw new Error('Impossible de téléverser la photo.');
    },
  });
  const controller = createPostFlowController({
    draftStorage,
    imageCompressionService: createImageCompressionServiceMock(),
    aiDraftService: createAiDraftServiceMock({
      status: 'ready',
      draftPatch: {
        categoryId: 'phones_tablets',
        title: 'Samsung Galaxy A54',
        condition: 'like_new',
        description: 'Téléphone propre avec boîte.',
      },
    }),
    createPreviewUrl: (file) => `blob:${file.name}`,
    mediaService,
  });

  await controller.captureFirstPhoto(createBrowserFile());

  await assert.rejects(
    () =>
      controller.addGuidedPhoto(
        'face',
        createBrowserFile({
          name: 'face.jpg',
          size: 850_000,
        }),
      ),
    /Impossible de téléverser la photo\./,
  );

  const failedDraft = draftStorage.loadDraft();
  const failedPhoto = failedDraft.photos.find((photo) => photo.promptId === 'face');

  assert.equal(failedPhoto?.uploadStatus, 'failed');
  assert.equal(failedPhoto?.uploadError, 'Impossible de téléverser la photo.');
  assert.ok(getMissingRequiredPhotoPrompts(failedDraft).some((prompt) => prompt.id === 'face'));
});

test('required categories block publish until all required photos are present', () => {
  const draft = createReadyDraft({
    categoryId: 'phones_tablets',
  });

  const initiallyMissing = getMissingRequiredPhotoPrompts(draft);

  assert.deepEqual(initiallyMissing.map((prompt) => prompt.id), ['face', 'back', 'screen_on']);

  const completedDraft = ['face', 'back', 'screen_on'].reduce(
    (currentDraft, promptId) =>
      addGuidedPhotoToDraft(currentDraft, {
        promptId,
        photo: {
          id: `photo-${promptId}`,
          previewUrl: `/assets/demo/${promptId}.jpg`,
          sizeBytes: 600_000,
        },
      }),
    draft,
  );

  assert.deepEqual(getMissingRequiredPhotoPrompts(completedDraft), []);
});

test('publish validation requires photo, category, condition when relevant, price, description, and area', () => {
  const emptyDraft = createReadyDraft({
    photos: [],
    categoryId: '',
    condition: '',
    priceCdf: null,
    description: '',
    area: '',
  });

  const baseErrors = validateDraftForPublish(emptyDraft);

  assert.ok(baseErrors.some((error) => error.field === 'photo'));
  assert.ok(baseErrors.some((error) => error.field === 'category'));
  assert.ok(baseErrors.some((error) => error.field === 'price'));
  assert.ok(baseErrors.some((error) => error.field === 'description'));
  assert.ok(baseErrors.some((error) => error.field === 'area'));

  const categoryDraft = createReadyDraft({
    categoryId: 'phones_tablets',
    condition: '',
    priceCdf: 450_000,
    description: 'Téléphone débloqué double SIM.',
    area: 'Golf',
  });

  const categoryErrors = validateDraftForPublish(categoryDraft);

  assert.ok(categoryErrors.some((error) => error.field === 'condition'));
});

test('publish validation blocks while queued uploads are still pending', () => {
  const validationErrors = validateDraftForPublish(createReadyDraft(), {
    uploadsBusy: true,
  });

  assert.equal(validationErrors[0]?.field, 'uploads_pending');
  assert.match(validationErrors[0]?.message || '', /Attendez la fin des téléversements/i);
});

test('seller can publish with only the primary uploaded photo during beta', () => {
  const validationErrors = validateDraftForPublish(
    createReadyDraft({
      categoryId: 'home_garden',
      condition: 'used_good',
      description: 'Canapé propre et disponible.',
      area: 'Golf',
      priceCdf: 350_000,
    }),
  );

  assert.equal(validationErrors.some((error) => error.field === 'guided_photos'), false);
});

test('publish validation rejects prices above the supported beta limit', () => {
  const validationErrors = validateDraftForPublish(
    createReadyDraft({
      priceCdf: MAX_PRICE_CDF + 1,
    }),
  );

  assert.ok(validationErrors.some((error) => error.field === 'price'));
  assert.match(
    validationErrors.find((error) => error.field === 'price')?.message || '',
    /2.?147.?483.?647 CDF/i,
  );
});

test('review form highlights publish blockers next to the submit action', () => {
  const draft = createReadyDraft({
    priceCdf: null,
    area: '',
  });
  const validationErrors = validateDraftForPublish(draft);
  const html = renderReviewFormScreen({
    areaOptions: ['Golf', 'Bel Air'],
    categories: [{ id: 'phones_tablets', label: 'Téléphones' }],
    conditionOptions: [{ value: 'like_new', label: 'Comme neuf' }],
    draft,
    validationErrors,
  });

  assert.match(html, /data-review-errors/);
  assert.match(html, /data-review-error-field="price"/);
  assert.match(html, /data-review-error-field="area"/);
  assert.match(html, /app-review__field app-review__field--invalid/);
});

test('review form keeps pricing fully manual and hides AI price guidance', () => {
  const draft = createReadyDraft();
  const html = renderReviewFormScreen({
    areaOptions: ['Golf', 'Bel Air'],
    categories: [{ id: 'electronics', label: 'Électronique' }],
    conditionOptions: [{ value: 'like_new', label: 'Comme neuf' }],
    draft,
    validationErrors: [],
  });

  assert.match(html, /Prix final \(CDF\)/);
  assert.match(html, /max="2147483647"/);
  assert.doesNotMatch(html, /Fourchette IA/i);
  assert.doesNotMatch(html, /Ajoutez votre prix librement/i);
  assert.doesNotMatch(html, /400 000 CDF/);
  assert.doesNotMatch(html, /520 000 CDF/);
});

test('review form explains that the draft was prepared from the uploaded photo', () => {
  const draft = createReadyDraft({
    ai: {
      status: 'ready',
      message: 'Brouillon préparé à partir de votre photo.',
    },
  });
  const html = renderReviewFormScreen({
    areaOptions: ['Golf', 'Bel Air'],
    categories: [{ id: 'electronics', label: 'Électronique' }],
    conditionOptions: [{ value: 'like_new', label: 'Comme neuf' }],
    draft,
    validationErrors: [],
  });

  assert.match(html, /Brouillon préparé à partir de votre photo\./i);
  assert.match(html, /Détails préparés/i);
});

test('review form keeps the seller in manual mode when AI falls back', () => {
  const draft = createReadyDraft({
    ai: {
      status: 'manual_fallback',
      message: "L'IA n'a pas pu préparer ce brouillon. Continuez manuellement.",
    },
  });
  const html = renderReviewFormScreen({
    areaOptions: ['Golf', 'Bel Air'],
    categories: [{ id: 'electronics', label: 'Électronique' }],
    conditionOptions: [{ value: 'like_new', label: 'Comme neuf' }],
    draft,
    validationErrors: [],
  });

  assert.match(html, /Préparation manuelle/i);
  assert.match(html, /Continuez manuellement/i);
});

test('review form renders the first draft image as the seller preview', () => {
  const draft = createReadyDraft({
    photos: [
      {
        id: 'photo-1',
        kind: 'primary',
        previewUrl: '/assets/demo/phone-front.jpg',
        publicUrl: 'https://cdn.zwibba.example/draft-photos/phone-front.jpg',
        url: 'https://cdn.zwibba.example/draft-photos/phone-front.jpg',
      },
    ],
  });
  const html = renderReviewFormScreen({
    areaOptions: ['Golf', 'Bel Air'],
    categories: [{ id: 'electronics', label: 'Électronique' }],
    conditionOptions: [{ value: 'like_new', label: 'Comme neuf' }],
    draft,
    validationErrors: [],
  });

  assert.match(
    html,
    /<img[^>]+class="app-review__hero-image"[^>]+src="https:\/\/cdn\.zwibba\.example\/draft-photos\/phone-front\.jpg"/,
  );
  assert.doesNotMatch(
    html,
    /<span>https:\/\/cdn\.zwibba\.example\/draft-photos\/phone-front\.jpg<\/span>/,
  );
});

test('review form shows a visual fallback when the primary photo source is unavailable', () => {
  const draft = createReadyDraft({
    photos: [
      {
        id: 'photo-1',
        kind: 'primary',
        uploadStatus: 'uploaded',
      },
    ],
  });
  const html = renderReviewFormScreen({
    areaOptions: ['Golf', 'Bel Air'],
    categories: [{ id: 'electronics', label: 'Électronique' }],
    conditionOptions: [{ value: 'like_new', label: 'Comme neuf' }],
    draft,
    validationErrors: [],
  });

  assert.match(html, /app-review__hero-media--fallback/);
  assert.match(html, /Aperçu indisponible/i);
});

test('guidance screen makes extra guided photos optional and keeps upload actions explicit', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: 'home_garden',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:primary.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-sofa.jpg',
        },
      ],
    }),
  });

  assert.match(html, /Vous pouvez publier avec la photo principale/i);
  assert.match(html, /Ajouter cette photo/i);
  assert.match(html, /Vue latérale/i);
  assert.match(html, /Vue d(?:&#39;|')ensemble/i);
  assert.match(html, /href="#review"/);
});

test('capture screen renders staged progress for the first photo upload', () => {
  const html = renderCaptureScreen({
    busyLabel: '',
    draft: null,
    uploadProgress: {
      activeStage: 'uploading',
      stages: [
        { id: 'compressing', label: 'Compression', state: 'complete' },
        { id: 'uploading', label: 'Téléversement', state: 'active' },
        { id: 'analyzing', label: 'Analyse IA', state: 'pending' },
      ],
      title: 'Préparation de la photo',
    },
  });

  assert.match(html, /Préparation de la photo/i);
  assert.match(html, /Compression/i);
  assert.match(html, /Téléversement/i);
  assert.match(html, /Analyse IA/i);
  assert.match(html, /is-active/);
});

test('guidance screen renders staged progress for guided uploads', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: 'home_garden',
    }),
    uploadProgress: {
      activeStage: 'uploading',
      stages: [
        { id: 'compressing', label: 'Compression', state: 'complete' },
        { id: 'uploading', label: 'Téléversement', state: 'active' },
        { id: 'complete', label: 'Terminé', state: 'pending' },
      ],
      title: 'Ajout de la photo guidée',
    },
    uploadsBusy: true,
  });

  assert.match(html, /Ajout de la photo guidée/i);
  assert.match(html, /Terminé/i);
  assert.match(html, /Téléversement/i);
});
