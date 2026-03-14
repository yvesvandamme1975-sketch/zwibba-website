import { getCategoryGuidance } from '../../models/category-guidance.mjs';
import {
  createListingDraftFromFirstPhoto,
  updateListingDraft,
} from '../../models/listing-draft.mjs';

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
  return draft.photos.some((photo) => photo.promptId === promptId);
}

function buildPrompt(promptId, required, draft) {
  return {
    id: promptId,
    label: promptLabels[promptId] ?? promptId,
    required,
    completed: hasPromptPhoto(draft, promptId),
  };
}

function resolveGuidance(categoryId) {
  return getCategoryGuidance(categoryId);
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
        suggestedPriceMinCdf:
          patch.suggestedPriceMinCdf ?? draft.details.suggestedPriceMinCdf,
        suggestedPriceMaxCdf:
          patch.suggestedPriceMaxCdf ?? draft.details.suggestedPriceMaxCdf,
      },
      ai: {
        status: 'ready',
        message: 'Brouillon préparé par IA.',
      },
      guidance: resolveGuidance(patch.categoryId ?? draft.details.categoryId),
    },
    { now },
  );
}

export function validateDraftForPublish(draft) {
  const errors = [];

  if (!draft.photos.length) {
    errors.push({
      field: 'photo',
      message: 'Ajoutez au moins une photo.',
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

export function decidePublishGate({ draft, session }) {
  const validationErrors = validateDraftForPublish(draft);

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
  const photos =
    Object.prototype.hasOwnProperty.call(overrides, 'photos')
      ? overrides.photos
      : [
          {
            id: 'photo-1',
            kind: 'primary',
            url: overrides.photoUrl ?? '/assets/demo/phone-front.jpg',
            previewUrl: overrides.photoUrl ?? '/assets/demo/phone-front.jpg',
          },
        ];
  const draft = createListingDraftFromFirstPhoto({
    photoUrl: overrides.photoUrl ?? '/assets/demo/phone-front.jpg',
    photo: {
      id: 'photo-1',
      previewUrl: overrides.photoUrl ?? '/assets/demo/phone-front.jpg',
      sizeBytes: 1_200_000,
    },
    now,
  });
  const categoryId = overrides.categoryId ?? 'electronics';

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
        suggestedPriceMinCdf: overrides.suggestedPriceMinCdf ?? 400_000,
        suggestedPriceMaxCdf: overrides.suggestedPriceMaxCdf ?? 520_000,
      },
      ai: {
        status: 'ready',
        message: 'Brouillon préparé par IA.',
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
  now = () => new Date().toISOString(),
} = {}) {
  if (!draftStorage || !imageCompressionService || !aiDraftService) {
    throw new Error('Post flow dependencies are required.');
  }

  return {
    async captureFirstPhoto(photo) {
      const compressedPhoto = imageCompressionService.compressImage(photo);
      let draft = createListingDraftFromFirstPhoto({
        photoUrl: compressedPhoto.previewUrl ?? compressedPhoto.url,
        photo: compressedPhoto,
        now: now(),
      });
      const aiResult = await aiDraftService.generateDraft(compressedPhoto);

      draft = applyAiResultToDraft(draft, aiResult, {
        now: now(),
      });
      draftStorage.saveDraft(draft);

      return draft;
    },
    addGuidedPhoto(promptId, photo) {
      const draft = draftStorage.loadDraft();

      if (!draft) {
        throw new Error('No draft available.');
      }

      const compressedPhoto = imageCompressionService.compressImage(photo);
      const updatedDraft = addGuidedPhotoToDraft(draft, {
        promptId,
        photo: compressedPhoto,
        now: now(),
      });

      draftStorage.saveDraft(updatedDraft);

      return updatedDraft;
    },
    saveDraft(draft) {
      return draftStorage.saveDraft(draft);
    },
  };
}
