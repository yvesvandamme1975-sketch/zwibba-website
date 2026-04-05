import { updateListingDraft } from '../models/listing-draft.mjs';

export function syncDraftAreaFromProfile(draft, profileArea) {
  const normalizedArea = String(profileArea ?? '').trim();

  if (!draft || !normalizedArea) {
    return draft;
  }

  if (draft.details?.area?.trim()) {
    return draft;
  }

  return updateListingDraft(draft, {
    details: {
      area: normalizedArea,
    },
  });
}
