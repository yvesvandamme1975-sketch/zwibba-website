import {
  parseListingDraft,
  serializeListingDraft,
} from '../models/listing-draft.mjs';

export const draftStorageKey = 'zwibba_app_draft';

export function createMemoryStorage(initialEntries = {}) {
  const state = new Map(Object.entries(initialEntries));

  return {
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, value);
    },
    removeItem(key) {
      state.delete(key);
    },
  };
}

export function createDraftStorageService({
  storage,
  key = draftStorageKey,
} = {}) {
  if (!storage) {
    throw new Error('A storage adapter is required.');
  }

  return {
    clearDraft() {
      storage.removeItem(key);
    },
    loadDraft() {
      const serializedDraft = storage.getItem(key);

      if (!serializedDraft) {
        return null;
      }

      return parseListingDraft(serializedDraft);
    },
    saveDraft(draft) {
      storage.setItem(key, serializeListingDraft(draft));
      return draft;
    },
  };
}
