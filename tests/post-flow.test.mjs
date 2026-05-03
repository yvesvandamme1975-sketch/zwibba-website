import assert from 'node:assert/strict';
import test from 'node:test';

import { renderCaptureScreen } from '../App/features/post/capture-screen.mjs';
import { renderCaptureResultScreen } from '../App/features/post/capture-result-screen.mjs';
import { renderPhotoGuidanceScreen } from '../App/features/post/photo-guidance-screen.mjs';
import { renderReviewFormScreen } from '../App/features/post/review-form-screen.mjs';
import { sellerCategories } from '../App/demo-content.mjs';
import {
  MAX_PRICE_CDF,
  addGuidedPhotoToDraft,
  createPostFlowController,
  createReadyDraft,
  getMissingRequiredPhotoPrompts,
  refreshReviewValidationErrors,
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

test('AI fashion metadata prefills Mode item type and size when the signal is strong', async () => {
  const draftStorage = createDraftStorageService({
    storage: createMemoryStorage(),
  });
  const mediaService = createMediaServiceMock();
  const aiDraftService = createAiDraftServiceMock({
    status: 'ready',
    draftPatch: {
      categoryId: 'fashion',
      title: 'Baskets Nike blanches',
      condition: 'like_new',
      description: 'Chaussures avec taille lisible sur l’étiquette.',
      itemType: 'shoes',
      size: '39',
    },
  });
  const controller = createPostFlowController({
    draftStorage,
    imageCompressionService: createImageCompressionServiceMock(),
    aiDraftService,
    createPreviewUrl: (file) => `blob:${file.name}`,
    mediaService,
  });

  const draft = await controller.captureFirstPhoto(createBrowserFile({
    name: 'fashion-front.jpg',
    size: 1_200_000,
  }));

  assert.equal(draft.details.categoryId, 'fashion');
  assert.deepEqual(draft.details.attributesJson, {
    fashion: {
      itemType: 'shoes',
      size: '39',
    },
  });
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
  assert.match(
    html,
    /<label class="app-capture__picker">[\s\S]*<input[^>]+class="app-flow__file-input app-flow__file-input--overlay"[\s\S]*data-input="capture-first-photo"/,
  );
  assert.doesNotMatch(html, /for="app-capture-primary-input"/);
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
  assert.match(
    baseErrors.find((error) => error.field === 'area')?.message || '',
    /Définissez votre zone dans le profil avant de publier/i,
  );

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

test('review form shows the seller profile zone in read-only mode and hides the manual zone selector', () => {
  const draft = createReadyDraft({
    area: 'Golf',
  });
  const html = renderReviewFormScreen({
    categories: [{ id: 'electronics', label: 'Électronique' }],
    conditionOptions: [{ value: 'like_new', label: 'Comme neuf' }],
    draft,
    profileArea: 'Golf',
    validationErrors: [],
  });

  assert.match(html, /<span>Zone<\/span>/);
  assert.match(html, /Golf/);
  assert.match(html, /Modifier dans le profil/);
  assert.doesNotMatch(html, /name="area"/);
  assert.doesNotMatch(html, /Choisir une zone/);
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
  const draft = createReadyDraft({
    priceAmount: 450_000,
    priceCurrency: 'CDF',
  });
  const html = renderReviewFormScreen({
    categories: [{ id: 'electronics', label: 'Électronique' }],
    conditionOptions: [{ value: 'like_new', label: 'Comme neuf' }],
    draft,
    profileArea: 'Golf',
    validationErrors: [],
  });

  assert.match(html, /<span>Devise<\/span>/);
  assert.match(html, /name="priceCurrency"/);
  assert.match(html, /<option value="CDF" selected>CDF<\/option>/);
  assert.match(html, /<option value="USD">US\$<\/option>/);
  assert.match(html, /<span>Prix final<\/span>/);
  assert.match(html, /type="text"/);
  assert.match(html, /inputmode="numeric"/);
  assert.match(html, /placeholder="Ex: 450000"/);
  assert.match(html, /450 000 CDF/);
  assert.doesNotMatch(html, /Fourchette IA/i);
  assert.doesNotMatch(html, /Ajoutez votre prix librement/i);
  assert.doesNotMatch(html, /400 000 CDF/);
  assert.doesNotMatch(html, /520 000 CDF/);
});

test('review form disables price entry until a currency is chosen and supports USD previews', () => {
  const noCurrencyDraft = createReadyDraft({
    priceAmount: null,
    priceCurrency: '',
  });
  const disabledHtml = renderReviewFormScreen({
    categories: [{ id: 'electronics', label: 'Électronique' }],
    conditionOptions: [{ value: 'like_new', label: 'Comme neuf' }],
    draft: noCurrencyDraft,
    profileArea: 'Golf',
    validationErrors: [],
  });

  assert.match(disabledHtml, /name="priceCurrency"/);
  assert.match(disabledHtml, /name="priceAmount"/);
  assert.match(disabledHtml, /Choisissez d’abord une devise\./i);
  assert.match(disabledHtml, /disabled/);

  const usdDraft = createReadyDraft({
    priceAmount: 350,
    priceCurrency: 'USD',
  });
  const usdHtml = renderReviewFormScreen({
    categories: [{ id: 'electronics', label: 'Électronique' }],
    conditionOptions: [{ value: 'like_new', label: 'Comme neuf' }],
    draft: usdDraft,
    profileArea: 'Golf',
    validationErrors: [],
  });

  assert.match(usdHtml, /<option value="USD" selected>US\$<\/option>/);
  assert.match(usdHtml, /placeholder="Ex: 350"/);
  assert.match(usdHtml, /350 US\$/);
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
  assert.match(
    html,
    /<label[\s\S]+class="app-guidance__action"[\s\S]*>[\s\S]*<input[^>]+class="app-flow__file-input app-flow__file-input--overlay"[\s\S]*data-input="guided-photo"/,
  );
  assert.match(html, /href="#review"/);
});

test('guidance screen shows the uploaded primary photo and AI-generated details in read-only mode', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: 'fashion',
      condition: 'like_new',
      description: 'Robe wax bleu marine avec coupe droite.',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:robe.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-dress.jpg',
        },
      ],
      title: 'Robe wax bleu marine',
      ai: {
        status: 'ready',
        applied: true,
        message: 'Brouillon préparé à partir de votre photo.',
      },
    }),
  });

  assert.match(html, /Photo principale téléversée/i);
  assert.match(
    html,
    /<img[^>]+class="app-guidance__hero-image"[^>]+src="https:\/\/pub\.example\.test\/draft-photos\/capture\/photo_1-dress\.jpg"/,
  );
  assert.match(html, /Brouillon préparé par IA/i);
  assert.match(html, /Brouillon préparé à partir de votre photo\./i);
  assert.match(html, /<strong>Titre<\/strong>/);
  assert.match(html, /Robe wax bleu marine/);
  assert.match(html, /<strong>Catégorie<\/strong>/);
  assert.match(html, /Mode/);
  assert.match(html, /<strong>État<\/strong>/);
  assert.match(html, /Comme neuf/);
  assert.match(html, /<strong>Description<\/strong>/);
  assert.match(html, /Robe wax bleu marine avec coupe droite\./);
});

test('capture result screen shows the uploaded photo and AI-generated details before review', () => {
  const html = renderCaptureResultScreen({
    continueHref: '#review',
    continueLabel: 'Continuer vers le brouillon',
    draft: createReadyDraft({
      categoryId: 'fashion',
      condition: 'like_new',
      description: 'Robe wax bleu marine avec coupe droite.',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:robe.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-dress.jpg',
        },
      ],
      title: 'Robe wax bleu marine',
      ai: {
        status: 'ready',
        applied: true,
        message: 'Brouillon préparé à partir de votre photo.',
      },
    }),
  });

  assert.match(html, /Photo téléversée/i);
  assert.match(html, /Analyse IA terminée/i);
  assert.match(
    html,
    /<img[^>]+class="app-capture-result__hero-image"[^>]+src="https:\/\/pub\.example\.test\/draft-photos\/capture\/photo_1-dress\.jpg"/,
  );
  assert.match(html, /Brouillon préparé par IA/i);
  assert.match(html, /<strong>Titre<\/strong>/);
  assert.match(html, /Robe wax bleu marine/);
  assert.match(html, /<strong>Catégorie<\/strong>/);
  assert.match(html, /Mode/);
  assert.match(html, /<strong>État<\/strong>/);
  assert.match(html, /Comme neuf/);
  assert.match(html, /<strong>Description<\/strong>/);
  assert.match(html, /href="#review"/);
  assert.match(html, /Continuer vers le brouillon/i);
});

test('capture result screen shows a manual fallback note when AI preparation is unavailable', () => {
  const html = renderCaptureResultScreen({
    continueHref: '#guidance',
    continueLabel: 'Continuer vers les photos guidées',
    draft: createReadyDraft({
      categoryId: 'vehicles',
      condition: '',
      description: '',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:vehicle.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-vehicle.jpg',
        },
      ],
      title: '',
      ai: {
        status: 'manual_fallback',
        applied: false,
        message: "L'IA n'a pas pu préparer ce brouillon. Continuez manuellement.",
      },
    }),
  });

  assert.match(html, /Photo téléversée/i);
  assert.match(html, /Analyse IA indisponible/i);
  assert.match(html, /Continuez manuellement/i);
  assert.match(html, /href="#guidance"/);
  assert.match(html, /Continuer vers les photos guidées/i);
  assert.doesNotMatch(html, /<strong>Titre<\/strong>/);
});

test('guidance screen keeps the uploaded photo visible and shows a manual fallback note when AI is unavailable', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: '',
      condition: '',
      description: '',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:service.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-service.jpg',
        },
      ],
      title: '',
      ai: {
        status: 'manual_fallback',
        applied: false,
        message: "L'IA n'a pas pu préparer ce brouillon. Continuez manuellement.",
      },
    }),
  });

  assert.match(html, /Photo principale téléversée/i);
  assert.match(
    html,
    /<img[^>]+class="app-guidance__hero-image"[^>]+src="https:\/\/pub\.example\.test\/draft-photos\/capture\/photo_1-service\.jpg"/,
  );
  assert.match(html, /Complétion manuelle à l'étape suivante/i);
  assert.match(html, /Continuez manuellement/i);
  assert.match(html, /à confirmer/i);
  assert.doesNotMatch(html, /<strong>Titre<\/strong>/);
});

test('review form category dropdown includes the expanded seller categories with Emplois label', () => {
  const html = renderReviewFormScreen({
    areaOptions: ['Golf', 'Bel Air'],
    categories: sellerCategories,
    conditionOptions: [{ value: 'used_good', label: 'Bon état' }],
    draft: createReadyDraft(),
    validationErrors: [],
  });

  assert.match(html, />Alimentation<\/option>/);
  assert.match(html, />Agriculture<\/option>/);
  assert.match(html, />Bricolage ?\/ ?Construction<\/option>/);
  assert.match(html, />[ÉE]cole ?\/ ?Universit[ée]<\/option>/);
  assert.match(html, />Musique<\/option>/);
  assert.match(html, />Sant[ée]<\/option>/);
  assert.match(html, />Beaut[ée]<\/option>/);
  assert.match(html, />Emplois<\/option>/);
  assert.match(html, />Services<\/option>/);
  assert.match(html, />Sports et loisirs<\/option>/);
});

test('review form renders fashion item type and size fields for Mode listings', () => {
  const html = renderReviewFormScreen({
    areaOptions: ['Golf', 'Bel Air'],
    categories: sellerCategories,
    conditionOptions: [{ value: 'used_good', label: 'Bon état' }],
    draft: createReadyDraft({
      categoryId: 'fashion',
      attributesJson: {
        fashion: {
          itemType: 'shoes',
          size: '39',
        },
      },
    }),
    validationErrors: [],
  });

  assert.match(html, /name="fashionItemType"/);
  assert.match(html, />Chaussures<\/option>/);
  assert.match(html, /name="fashionSize"/);
  assert.match(html, />39<\/option>/);
  assert.match(html, /option value="39" selected/);
});

test('review form keeps fashion size disabled until a type is chosen', () => {
  const html = renderReviewFormScreen({
    areaOptions: ['Golf', 'Bel Air'],
    categories: sellerCategories,
    conditionOptions: [{ value: 'used_good', label: 'Bon état' }],
    draft: createReadyDraft({
      categoryId: 'fashion',
      attributesJson: {
        fashion: {
          itemType: '',
          size: '',
        },
      },
    }),
    validationErrors: [],
  });

  assert.match(html, /name="fashionSize"[\s\S]*disabled/);
});

test('publish validation requires item type and size for Mode listings', () => {
  const errors = validateDraftForPublish(
    createReadyDraft({
      categoryId: 'fashion',
      attributesJson: {
        fashion: {
          itemType: '',
          size: '',
        },
      },
    }),
  );

  assert.deepEqual(
    errors
      .filter((error) => error.field === 'fashion_item_type' || error.field === 'fashion_size')
      .map((error) => error.field),
    ['fashion_item_type', 'fashion_size'],
  );
});

test('review validation clears a stale price-currency error once currency and amount are fixed', () => {
  const initialErrors = validateDraftForPublish(
    createReadyDraft({
      priceAmount: null,
      priceCurrency: '',
    }),
  );

  const refreshedErrors = refreshReviewValidationErrors(
    initialErrors,
    createReadyDraft({
      priceAmount: 350,
      priceCurrency: 'USD',
    }),
  );

  assert.equal(
    refreshedErrors.some(
      (error) => error.field === 'price' && /Choisissez une devise pour votre prix\./.test(error.message),
    ),
    false,
  );
});

test('services guidance suggests a business card or company logo', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: 'services',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:service.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-service.jpg',
        },
      ],
    }),
  });

  assert.match(html, /Carte de visite ou logo/i);
  assert.match(html, /Ajouter cette photo/i);
  assert.match(html, /la publication reste possible pendant la bêta/i);
});

test('emploi guidance suggests a company visual or logo', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: 'emploi',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:emploi.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-emploi.jpg',
        },
      ],
    }),
  });

  assert.match(html, /Logo ou visuel de l(?:&#39;|')entreprise/i);
  assert.match(html, /Ajouter cette photo/i);
  assert.match(html, /la publication reste possible pendant la bêta/i);
});

test('vehicle guidance requires five specific photos', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: 'vehicles',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:vehicle.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-vehicle.jpg',
        },
      ],
    }),
  });

  assert.match(html, />Avant</);
  assert.match(html, />Arrière</);
  assert.match(html, />Vue droite</);
  assert.match(html, />Vue gauche</);
  assert.match(html, />Intérieur</);
});

test('vehicle publish requires avant, arrière, droite, gauche and intérieur photos', () => {
  const validationErrors = validateDraftForPublish(
    createReadyDraft({
      categoryId: 'vehicles',
      photos: [
        {
          id: 'photo-primary',
          kind: 'primary',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-vehicle.jpg',
        },
        {
          id: 'photo-avant',
          kind: 'guided',
          promptId: 'avant',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/avant.jpg',
        },
        {
          id: 'photo-arriere',
          kind: 'guided',
          promptId: 'arriere',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/arriere.jpg',
        },
        {
          id: 'photo-droite',
          kind: 'guided',
          promptId: 'droite',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/droite.jpg',
        },
        {
          id: 'photo-gauche',
          kind: 'guided',
          promptId: 'gauche',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/gauche.jpg',
        },
      ],
    }),
  );

  assert.ok(validationErrors.some((error) => error.field === 'guided_photos'));
  assert.match(
    validationErrors.find((error) => error.field === 'guided_photos')?.message || '',
    /intérieur/i,
  );
});

test('food guidance suggests an overview and packaging label photo', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: 'food',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:food.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-food.jpg',
        },
      ],
    }),
  });

  assert.match(html, /Vue d(?:'|&#39;)ensemble/i);
  assert.match(html, /Emballage ou étiquette/i);
});

test('agriculture guidance suggests an overview and equipment condition photo', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: 'agriculture',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:agri.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-agri.jpg',
        },
      ],
    }),
  });

  assert.match(html, /Vue d(?:'|&#39;)ensemble/i);
  assert.match(html, /État du matériel/i);
});

test('education guidance suggests an overview and full lot photo', () => {
  const html = renderPhotoGuidanceScreen({
    draft: createReadyDraft({
      categoryId: 'education',
      photos: [
        {
          id: 'photo-1',
          kind: 'primary',
          previewUrl: 'blob:education.jpg',
          uploadStatus: 'uploaded',
          url: 'https://pub.example.test/draft-photos/capture/photo_1-education.jpg',
        },
      ],
    }),
  });

  assert.match(html, /Vue d(?:'|&#39;)ensemble/i);
  assert.match(html, /Lot complet/i);
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
