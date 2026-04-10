export const draftSyncStates = {
  localOnly: 'local_only',
  accountSyncable: 'account_syncable',
};

function normalizePriceCurrency(rawValue) {
  if (rawValue === 'CDF' || rawValue === 'USD') {
    return rawValue;
  }

  return '';
}

function normalizePriceAmount(details = {}) {
  if (details.priceAmount === null || details.priceAmount === undefined || details.priceAmount === '') {
    return details.priceCdf ?? null;
  }

  return details.priceAmount;
}

function createEmptyDetails() {
  return {
    title: '',
    categoryId: '',
    condition: '',
    priceAmount: null,
    priceCurrency: '',
    description: '',
    area: '',
  };
}

function normalizeDetails(details = {}) {
  const priceAmount = normalizePriceAmount(details);
  const priceCurrency =
    normalizePriceCurrency(details.priceCurrency) || (priceAmount != null ? 'CDF' : '');

  return {
    title: details.title ?? '',
    categoryId: details.categoryId ?? '',
    condition: details.condition ?? '',
    priceAmount,
    priceCurrency,
    description: details.description ?? '',
    area: details.area ?? '',
  };
}

function normalizeDetailUpdates(details = {}) {
  const nextDetails = {};

  if (Object.prototype.hasOwnProperty.call(details, 'title')) {
    nextDetails.title = details.title ?? '';
  }

  if (Object.prototype.hasOwnProperty.call(details, 'categoryId')) {
    nextDetails.categoryId = details.categoryId ?? '';
  }

  if (Object.prototype.hasOwnProperty.call(details, 'condition')) {
    nextDetails.condition = details.condition ?? '';
  }

  if (Object.prototype.hasOwnProperty.call(details, 'priceAmount')) {
    nextDetails.priceAmount = details.priceAmount ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(details, 'priceCurrency')) {
    nextDetails.priceCurrency = normalizePriceCurrency(details.priceCurrency);
  }

  if (Object.prototype.hasOwnProperty.call(details, 'priceCdf')) {
    nextDetails.priceAmount = details.priceCdf ?? null;

    if (!Object.prototype.hasOwnProperty.call(details, 'priceCurrency')) {
      nextDetails.priceCurrency = details.priceCdf == null ? '' : 'CDF';
    }
  }

  if (Object.prototype.hasOwnProperty.call(details, 'description')) {
    nextDetails.description = details.description ?? '';
  }

  if (Object.prototype.hasOwnProperty.call(details, 'area')) {
    nextDetails.area = details.area ?? '';
  }

  return nextDetails;
}

function createEmptyAiState() {
  return {
    applied: false,
    status: 'idle',
    message: '',
    confidence: 0,
  };
}

function createEmptyGuidance() {
  return {
    required: [],
    optional: [],
  };
}

function createEmptyUploadState() {
  return {
    compressed: false,
    originalSizeBytes: null,
    uploadedSizeBytes: null,
  };
}

function normalizePhoto(photo = {}, index = 0) {
  const fallbackId = index === 0 ? 'photo-1' : `photo-${index + 1}`;
  const url = photo.url ?? photo.previewUrl ?? '';
  const sizeBytes = photo.sizeBytes ?? photo.size ?? null;

  return {
    id: photo.id ?? fallbackId,
    kind: photo.kind ?? (index === 0 ? 'primary' : 'guided'),
    objectKey: photo.objectKey ?? '',
    photoId: photo.photoId ?? '',
    promptId: photo.promptId ?? '',
    publicUrl: photo.publicUrl ?? '',
    uploadError: photo.uploadError ?? '',
    sourcePresetId: photo.sourcePresetId ?? '',
    uploadStatus: photo.uploadStatus ?? '',
    fileName: photo.fileName ?? photo.name ?? '',
    contentType: photo.contentType ?? photo.type ?? '',
    url,
    previewUrl: photo.previewUrl ?? url,
    sizeBytes,
    originalSizeBytes: photo.originalSizeBytes ?? sizeBytes,
    wasCompressed: Boolean(photo.wasCompressed),
  };
}

function buildDraftShape(draft) {
  const photos = Array.isArray(draft.photos)
    ? draft.photos.map((photo, index) => normalizePhoto(photo, index))
    : [];

  return {
    ...draft,
    photos,
    auth: {
      phoneNumber: draft.auth?.phoneNumber ?? '',
      otpVerified: Boolean(draft.auth?.otpVerified),
    },
    details: normalizeDetails(draft.details),
    ai: {
      ...createEmptyAiState(),
      ...draft.ai,
    },
    guidance: {
      ...createEmptyGuidance(),
      ...draft.guidance,
    },
    upload: {
      ...createEmptyUploadState(),
      ...draft.upload,
    },
    ownerPhoneNumber: draft.ownerPhoneNumber ?? '',
    remoteDraftId: draft.remoteDraftId ?? draft.syncedDraftId ?? '',
    syncStatus: draft.syncStatus ?? '',
    canSyncToAccount: draft.syncState === draftSyncStates.accountSyncable,
  };
}

function createDraftId() {
  return globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}`;
}

export function createEmptyListingDraft({ now = new Date().toISOString() } = {}) {
  return buildDraftShape({
    id: createDraftId(),
    createdAt: now,
    updatedAt: now,
    photos: [],
    syncState: draftSyncStates.localOnly,
    auth: {
      phoneNumber: '',
      otpVerified: false,
    },
    details: createEmptyDetails(),
    ai: createEmptyAiState(),
    guidance: createEmptyGuidance(),
    upload: createEmptyUploadState(),
    ownerPhoneNumber: '',
    remoteDraftId: '',
    syncStatus: '',
  });
}

export function createListingDraftFromFirstPhoto({
  photoUrl,
  photo = null,
  now = new Date().toISOString(),
}) {
  const draft = createEmptyListingDraft({ now });

  return buildDraftShape({
    ...draft,
    photos: [
      normalizePhoto(
        {
          ...photo,
          id: photo?.id ?? 'photo-1',
          kind: 'primary',
          url: photoUrl,
        },
        0,
      ),
    ],
    upload: {
      compressed: Boolean(photo?.wasCompressed),
      originalSizeBytes: photo?.originalSizeBytes ?? photo?.sizeBytes ?? null,
      uploadedSizeBytes: photo?.sizeBytes ?? null,
    },
  });
}

export function updateListingDraft(draft, updates, { now = new Date().toISOString() } = {}) {
  return buildDraftShape({
    ...draft,
    ...updates,
    updatedAt: now,
    auth: {
      ...draft.auth,
      ...updates.auth,
    },
    details: {
      ...normalizeDetails(draft.details),
      ...normalizeDetailUpdates(updates.details),
    },
    ai: {
      ...draft.ai,
      ...updates.ai,
    },
    guidance: {
      ...draft.guidance,
      ...updates.guidance,
    },
    upload: {
      ...draft.upload,
      ...updates.upload,
    },
    photos: updates.photos ?? draft.photos,
  });
}

export function markDraftOtpVerified(draft, { phoneNumber, now = new Date().toISOString() }) {
  return updateListingDraft(draft, {
    syncState: draftSyncStates.accountSyncable,
    auth: {
      phoneNumber,
      otpVerified: true,
    },
  }, { now });
}

export function serializeListingDraft(draft) {
  return JSON.stringify(draft);
}

export function parseListingDraft(serializedDraft) {
  return buildDraftShape(JSON.parse(serializedDraft));
}
