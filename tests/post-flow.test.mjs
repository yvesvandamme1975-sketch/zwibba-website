import assert from 'node:assert/strict';
import test from 'node:test';

import { renderPhotoGuidanceScreen } from '../App/features/post/photo-guidance-screen.mjs';
import {
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
  return {
    async generateDraft() {
      return result;
    },
  };
}

function createImageCompressionServiceMock() {
  return {
    compressImage(photo) {
      return {
        ...photo,
        originalSizeBytes: photo.sizeBytes,
        sizeBytes: Math.min(photo.sizeBytes, 1_500_000),
        wasCompressed: photo.sizeBytes > 1_500_000,
      };
    },
  };
}

test('first photo starts a draft', async () => {
  const draftStorage = createDraftStorageService({
    storage: createMemoryStorage(),
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
        suggestedPriceMinCdf: 300_000,
        suggestedPriceMaxCdf: 360_000,
      },
    }),
  });

  const draft = await controller.captureFirstPhoto({
    id: 'phone-front',
    previewUrl: '/assets/demo/phone-front.jpg',
    sizeBytes: 3_400_000,
  });

  assert.equal(draft.photos.length, 1);
  assert.equal(draft.photos[0].url, '/assets/demo/phone-front.jpg');
  assert.equal(draft.details.categoryId, 'phones_tablets');
  assert.equal(draftStorage.loadDraft().id, draft.id);
});

test('AI category suggestion drives guided-photo prompts', async () => {
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
  });

  const draft = await controller.captureFirstPhoto({
    id: 'phone-front',
    previewUrl: '/assets/demo/phone-front.jpg',
    sizeBytes: 2_200_000,
  });

  const html = renderPhotoGuidanceScreen({ draft });

  assert.match(html, /Face/);
  assert.match(html, /Dos/);
  assert.match(html, /Écran allumé/);
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
