export const draftSyncStates = {
  localOnly: 'local_only',
  accountSyncable: 'account_syncable',
};

function createEmptyDetails() {
  return {
    title: '',
    categoryId: '',
    condition: '',
    priceCdf: null,
    description: '',
    area: '',
    suggestedPriceMinCdf: null,
    suggestedPriceMaxCdf: null,
  };
}

function createEmptyAiState() {
  return {
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

  return {
    id: photo.id ?? fallbackId,
    kind: photo.kind ?? (index === 0 ? 'primary' : 'guided'),
    promptId: photo.promptId ?? '',
    url,
    previewUrl: photo.previewUrl ?? url,
    sizeBytes: photo.sizeBytes ?? null,
    originalSizeBytes: photo.originalSizeBytes ?? photo.sizeBytes ?? null,
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
    details: {
      ...createEmptyDetails(),
      ...draft.details,
    },
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
      ...draft.details,
      ...updates.details,
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
