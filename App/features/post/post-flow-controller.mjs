import { getCategoryGuidance } from '../../models/category-guidance.mjs';
import {
  createListingDraftFromFirstPhoto,
  updateListingDraft,
} from '../../models/listing-draft.mjs';
import { formatCdf } from '../../utils/rendering.mjs';

export const MAX_PRICE_CDF = 2_147_483_647;

const promptLabels = {
  accessoires: 'Accessoires',
  avant: 'Avant',
  back: 'Dos',
  chambre: 'Chambre',
  cote: 'Vue latérale',
  cuisine: 'Cuisine',
  defaut: 'Défaut visible',
  detail: 'Détail',
  etiquette: 'Étiquette',
  face: 'Face',
  facade: 'Façade',
  interieur: 'Intérieur',
  kilometrage: 'Kilométrage',
  salle_de_bain: 'Salle de bain',
  salon: 'Salon',
  screen_on: 'Écran allumé',
  tableau_de_bord: 'Tableau de bord',
  taille: 'Taille',
  vue_ensemble: "Vue d'ensemble",
};

const conditionRequiredCategories = new Set([
  'phones_tablets',
  'vehicles',
  'fashion',
  'home_garden',
]);

function hasPromptPhoto(draft, promptId) {
  return draft.photos.some(
    (photo) => photo.promptId === promptId && isPhotoReadyForDraft(photo),
  );
}

function buildPrompt(promptId, required, draft) {
  const photo = draft.photos.find((entry) => entry.promptId === promptId);

  return {
    id: promptId,
    label: promptLabels[promptId] ?? promptId,
    required,
    completed: hasPromptPhoto(draft, promptId),
    previewUrl: resolvePhotoRenderUrl(photo),
    uploadError: photo?.uploadError ?? '',
    uploadStatus: photo?.uploadStatus ?? '',
  };
}

function resolveGuidance(categoryId) {
  return getCategoryGuidance(categoryId);
}

function createPhotoId(prefix) {
  return globalThis.crypto?.randomUUID?.()
    ? `${prefix}-${globalThis.crypto.randomUUID()}`
    : `${prefix}-${Date.now()}`;
}

function resolveSourcePresetId(kind, promptId) {
  if (kind === 'guided') {
    return promptId || 'guided';
  }

  return 'capture';
}

function resolvePhotoRenderUrl(photo) {
  return photo?.publicUrl || photo?.url || photo?.previewUrl || '';
}

function isPhotoReadyForDraft(photo) {
  if (!photo) {
    return false;
  }

  if (photo.uploadStatus === 'uploaded') {
    return true;
  }

  if (photo.uploadStatus === 'uploading' || photo.uploadStatus === 'failed') {
    return false;
  }

  return Boolean(resolvePhotoRenderUrl(photo));
}

function resolvePrimaryPhoto(draft) {
  return draft.photos.find((photo) => photo.kind === 'primary') ?? draft.photos[0] ?? null;
}

function createSelectedPhotoRecord(
  file,
  {
    createPreviewUrl,
    kind,
    promptId = '',
  },
) {
  const sourcePresetId = resolveSourcePresetId(kind, promptId);
  const fileName = file.name || `${sourcePresetId}-${Date.now()}.jpg`;
  const contentType = file.type || 'image/jpeg';
  const previewUrl =
    typeof createPreviewUrl === 'function'
      ? createPreviewUrl(file)
      : file.previewUrl || file.url || '';

  return {
    id: createPhotoId(sourcePresetId),
    kind,
    promptId,
    sourcePresetId,
    uploadStatus: 'uploading',
    uploadError: '',
    previewUrl,
    url: previewUrl,
    fileName,
    contentType,
    sizeBytes: file.size ?? file.sizeBytes ?? null,
  };
}

async function readSelectedPhotoBytes(file) {
  if (typeof file.arrayBuffer === 'function') {
    return new Uint8Array(await file.arrayBuffer());
  }

  if (file.bytes instanceof Uint8Array) {
    return file.bytes;
  }

  if (Array.isArray(file.bytes)) {
    return Uint8Array.from(file.bytes);
  }

  throw new Error('Photo introuvable.');
}

async function uploadDraftPhoto({
  mediaService,
  file,
  photo,
}) {
  const bytes = await readSelectedPhotoBytes(file);
  const slot = await mediaService.requestUploadSlot({
    contentType: photo.contentType || 'image/jpeg',
    fileName: photo.fileName || `${photo.sourcePresetId || photo.id}.jpg`,
    sourcePresetId: photo.sourcePresetId || resolveSourcePresetId(photo.kind, photo.promptId),
  });

  await mediaService.uploadBytes({
    bytes,
    contentType: photo.contentType || 'image/jpeg',
    publicUrl: slot.publicUrl,
    uploadUrl: slot.uploadUrl,
  });

  return {
    ...photo,
    objectKey: slot.objectKey,
    photoId: slot.photoId,
    publicUrl: slot.publicUrl,
    sourcePresetId: slot.sourcePresetId,
    uploadStatus: 'uploaded',
    uploadError: '',
    url: slot.publicUrl,
  };
}

function attachDraftToError(error, draft) {
  const nextError = error instanceof Error ? error : new Error(String(error || 'Erreur upload.'));

  nextError.draft = draft;
  return nextError;
}

export function getGuidedPhotoPrompts(draft) {
  const guidance = resolveGuidance(draft.details.categoryId);

  return [
    ...guidance.required.map((promptId) => buildPrompt(promptId, true, draft)),
    ...guidance.optional.map((promptId) => buildPrompt(promptId, false, draft)),
  ];
}

export function getMissingRequiredPhotoPrompts(draft) {
  return getGuidedPhotoPrompts(draft).filter((prompt) => prompt.required && !prompt.completed);
}

export function isConditionRequired(draft) {
  return conditionRequiredCategories.has(draft.details.categoryId);
}

export function addGuidedPhotoToDraft(
  draft,
  {
    promptId,
    photo,
    now = new Date().toISOString(),
  },
) {
  const nextPhoto = {
    ...photo,
    id: photo.id ?? `photo-${draft.photos.length + 1}`,
    kind: 'guided',
    promptId,
    url: photo.url ?? photo.previewUrl ?? '',
    previewUrl: photo.previewUrl ?? photo.url ?? '',
  };
  const otherPhotos = draft.photos.filter((existingPhoto) => existingPhoto.promptId !== promptId);
  const primaryPhotos = otherPhotos.filter((existingPhoto) => existingPhoto.kind === 'primary');
  const guidedPhotos = otherPhotos.filter((existingPhoto) => existingPhoto.kind !== 'primary');

  return updateListingDraft(
    draft,
    {
      photos: [...primaryPhotos, ...guidedPhotos, nextPhoto],
      guidance: resolveGuidance(draft.details.categoryId),
    },
    { now },
  );
}

export function applyAiResultToDraft(
  draft,
  aiResult,
  { now = new Date().toISOString() } = {},
) {
  if (aiResult.status === 'manual_fallback') {
    return updateListingDraft(
      draft,
      {
        ai: {
          status: 'manual_fallback',
          message: aiResult.message,
        },
      },
      { now },
    );
  }

  const patch = aiResult.draftPatch ?? {};

  return updateListingDraft(
    draft,
    {
      details: {
        title: patch.title ?? draft.details.title,
        categoryId: patch.categoryId ?? draft.details.categoryId,
        condition: patch.condition ?? draft.details.condition,
        description: patch.description ?? draft.details.description,
      },
      ai: {
        status: 'ready',
        message: 'Brouillon préparé à partir de votre photo.',
      },
      guidance: resolveGuidance(patch.categoryId ?? draft.details.categoryId),
    },
    { now },
  );
}

export function validateDraftForPublish(
  draft,
  {
    uploadsBusy = false,
  } = {},
) {
  const errors = [];
  const primaryPhoto = resolvePrimaryPhoto(draft);

  if (uploadsBusy) {
    errors.push({
      field: 'uploads_pending',
      message: 'Attendez la fin des téléversements avant de publier.',
    });
  }

  if (!isPhotoReadyForDraft(primaryPhoto)) {
    errors.push({
      field: 'photo',
      message:
        primaryPhoto?.uploadStatus === 'uploading'
          ? 'Attendez la fin du téléversement de la photo principale.'
          : primaryPhoto?.uploadStatus === 'failed'
            ? 'Réessayez la photo principale avant de publier.'
            : 'Ajoutez au moins une photo.',
    });
  }

  if (!draft.details.categoryId) {
    errors.push({
      field: 'category',
      message: 'Confirmez la catégorie.',
    });
  }

  const missingRequiredPrompts = getMissingRequiredPhotoPrompts(draft);
  if (missingRequiredPrompts.length) {
    errors.push({
      field: 'guided_photos',
      message: `Ajoutez aussi: ${missingRequiredPrompts.map((prompt) => prompt.label).join(', ')}.`,
    });
  }

  if (isConditionRequired(draft) && !draft.details.condition) {
    errors.push({
      field: 'condition',
      message: "L'état est requis pour cette catégorie.",
    });
  }

  if (!draft.details.priceCdf) {
    errors.push({
      field: 'price',
      message: 'Choisissez un prix final.',
    });
  } else if (draft.details.priceCdf > MAX_PRICE_CDF) {
    errors.push({
      field: 'price',
      message: `Le prix final doit rester inférieur à ${formatCdf(MAX_PRICE_CDF)}.`,
    });
  }

  if (!draft.details.description?.trim()) {
    errors.push({
      field: 'description',
      message: 'Ajoutez une courte description.',
    });
  }

  if (!draft.details.area?.trim()) {
    errors.push({
      field: 'area',
      message: 'Sélectionnez une zone manuellement.',
    });
  }

  return errors;
}

export function decidePublishGate({
  draft,
  session,
  uploadsBusy = false,
}) {
  const validationErrors = validateDraftForPublish(draft, {
    uploadsBusy,
  });

  if (validationErrors.length) {
    return {
      status: 'validation_error',
      nextRoute: '#review',
      errors: validationErrors,
    };
  }

  if (!session) {
    return {
      status: 'needs_auth',
      nextRoute: '#auth-welcome',
    };
  }

  return {
    status: 'ready_for_submission',
    nextRoute: '#publish',
  };
}

export function createReadyDraft(overrides = {}) {
  const now = overrides.now ?? new Date().toISOString();
  const condition =
    Object.prototype.hasOwnProperty.call(overrides, 'condition') ? overrides.condition : '';
  const categoryId = overrides.categoryId ?? 'electronics';
  const defaultPreviewUrl = overrides.photoUrl ?? '/uploads/phone-front.jpg';
  const photos =
    Object.prototype.hasOwnProperty.call(overrides, 'photos')
      ? overrides.photos
      : [
          {
            id: 'photo-1',
            kind: 'primary',
            url: defaultPreviewUrl,
            previewUrl: defaultPreviewUrl,
            uploadStatus: 'uploaded',
          },
        ];
  const draft = createListingDraftFromFirstPhoto({
    photoUrl: defaultPreviewUrl,
    photo: {
      id: 'photo-1',
      previewUrl: defaultPreviewUrl,
      sizeBytes: 1_200_000,
    },
    now,
  });

  return updateListingDraft(
    draft,
    {
      photos,
      details: {
        title: overrides.title ?? 'Annonce prête à publier',
        categoryId,
        condition,
        priceCdf:
          Object.prototype.hasOwnProperty.call(overrides, 'priceCdf') ? overrides.priceCdf : 450_000,
        description: overrides.description ?? 'Article prêt, propre et disponible immédiatement.',
        area: overrides.area ?? 'Golf',
      },
      ai: overrides.ai ?? {
        status: 'ready',
        message: 'Brouillon préparé à partir de votre photo.',
      },
      guidance: resolveGuidance(categoryId),
    },
    { now },
  );
}

export function createPostFlowController({
  draftStorage,
  imageCompressionService,
  aiDraftService,
  mediaService,
  createPreviewUrl = (file) => file.previewUrl || file.url || '',
  now = () => new Date().toISOString(),
} = {}) {
  if (!draftStorage || !imageCompressionService || !aiDraftService || !mediaService) {
    throw new Error('Post flow dependencies are required.');
  }

  return {
    async captureFirstPhoto(file) {
      const preparedPhoto = imageCompressionService.compressImage(
        createSelectedPhotoRecord(file, {
          createPreviewUrl,
          kind: 'primary',
        }),
      );
      let draft = createListingDraftFromFirstPhoto({
        photoUrl: preparedPhoto.previewUrl ?? preparedPhoto.url,
        photo: preparedPhoto,
        now: now(),
      });
      draftStorage.saveDraft(draft);

      try {
        const uploadedPhoto = await uploadDraftPhoto({
          file,
          mediaService,
          photo: draft.photos[0],
        });
        draft = updateListingDraft(
          draft,
          {
            photos: [uploadedPhoto],
          },
          { now: now() },
        );
        const aiResult = await aiDraftService.generateDraft(uploadedPhoto);

        draft = applyAiResultToDraft(draft, aiResult, {
          now: now(),
        });
        draftStorage.saveDraft(draft);

        return draft;
      } catch (error) {
        const failedDraft = updateListingDraft(
          draft,
          {
            photos: [
              {
                ...draft.photos[0],
                uploadStatus: 'failed',
                uploadError:
                  error instanceof Error ? error.message : 'Impossible de téléverser la photo.',
              },
            ],
          },
          { now: now() },
        );
        draftStorage.saveDraft(failedDraft);
        throw attachDraftToError(error, failedDraft);
      }
    },
    async addGuidedPhoto(promptId, file) {
      const draft = draftStorage.loadDraft();

      if (!draft) {
        throw new Error('No draft available.');
      }

      const compressedPhoto = imageCompressionService.compressImage(
        createSelectedPhotoRecord(file, {
          createPreviewUrl,
          kind: 'guided',
          promptId,
        }),
      );
      let updatedDraft = addGuidedPhotoToDraft(draft, {
        promptId,
        photo: compressedPhoto,
        now: now(),
      });

      draftStorage.saveDraft(updatedDraft);

      const insertedPhoto = updatedDraft.photos.find((photo) => photo.promptId === promptId);

      try {
        const uploadedPhoto = await uploadDraftPhoto({
          file,
          mediaService,
          photo: insertedPhoto,
        });
        updatedDraft = addGuidedPhotoToDraft(updatedDraft, {
          promptId,
          photo: uploadedPhoto,
          now: now(),
        });
        draftStorage.saveDraft(updatedDraft);

        return updatedDraft;
      } catch (error) {
        const failedDraft = addGuidedPhotoToDraft(updatedDraft, {
          promptId,
          photo: {
            ...insertedPhoto,
            uploadStatus: 'failed',
            uploadError:
              error instanceof Error ? error.message : 'Impossible de téléverser la photo.',
          },
          now: now(),
        });
        draftStorage.saveDraft(failedDraft);
        throw attachDraftToError(error, failedDraft);
      }
    },
    saveDraft(draft) {
      return draftStorage.saveDraft(draft);
    },
  };
}
