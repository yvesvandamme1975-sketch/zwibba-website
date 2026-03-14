export const draftSyncStates = {
  localOnly: 'local_only',
  accountSyncable: 'account_syncable',
};

function buildDraftShape(draft) {
  return {
    ...draft,
    canSyncToAccount: draft.syncState === draftSyncStates.accountSyncable,
  };
}

function createDraftId() {
  return globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}`;
}

export function createListingDraftFromFirstPhoto({ photoUrl, now = new Date().toISOString() }) {
  return buildDraftShape({
    id: createDraftId(),
    createdAt: now,
    updatedAt: now,
    photos: [
      {
        id: 'photo-1',
        kind: 'primary',
        url: photoUrl,
      },
    ],
    syncState: draftSyncStates.localOnly,
    auth: {
      phoneNumber: '',
      otpVerified: false,
    },
    details: {
      categoryId: '',
      condition: '',
      priceCdf: null,
      description: '',
      area: '',
    },
  });
}

export function markDraftOtpVerified(draft, { phoneNumber, now = new Date().toISOString() }) {
  return buildDraftShape({
    ...draft,
    updatedAt: now,
    syncState: draftSyncStates.accountSyncable,
    auth: {
      phoneNumber,
      otpVerified: true,
    },
  });
}

export function serializeListingDraft(draft) {
  return JSON.stringify(draft);
}

export function parseListingDraft(serializedDraft) {
  return buildDraftShape(JSON.parse(serializedDraft));
}
