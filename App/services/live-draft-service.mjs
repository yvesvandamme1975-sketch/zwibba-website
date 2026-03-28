import { updateListingDraft } from '../models/listing-draft.mjs';

function createHttpError(message, status) {
  const error = new Error(message);

  error.status = status;
  return error;
}

async function parseError(response, fallbackMessage) {
  try {
    const json = await response.json();
    const message = json?.message;

    if (typeof message === 'string' && message.trim()) {
      return createHttpError(message, response.status);
    }
  } catch {}

  return createHttpError(fallbackMessage, response.status);
}

function buildPhotoPayload(photo) {
  return {
    objectKey: photo.objectKey ?? '',
    photoId: photo.photoId ?? '',
    publicUrl: photo.publicUrl ?? '',
    sourcePresetId: photo.sourcePresetId ?? photo.promptId ?? photo.kind ?? 'capture',
    uploadStatus: photo.uploadStatus ?? 'pending',
  };
}

function mergeSyncedPhotos(localPhotos, syncedPhotos) {
  return syncedPhotos.map((syncedPhoto, index) => {
    const localPhoto =
      localPhotos.find((photo) => photo.photoId && photo.photoId === syncedPhoto.photoId) ??
      localPhotos.find((photo) => photo.objectKey && photo.objectKey === syncedPhoto.objectKey) ??
      localPhotos[index] ??
      {};

    return {
      ...localPhoto,
      ...syncedPhoto,
      url: syncedPhoto.publicUrl || localPhoto.url || localPhoto.previewUrl || '',
      previewUrl: localPhoto.previewUrl || syncedPhoto.publicUrl || localPhoto.url || '',
    };
  });
}

export function createLiveDraftService({
  apiBaseUrl,
  fetchFn = globalThis.fetch,
} = {}) {
  if (!apiBaseUrl) {
    throw new Error('An API base URL is required.');
  }

  if (typeof fetchFn !== 'function') {
    throw new Error('A fetch implementation is required.');
  }

  return {
    async syncDraft({
      draft,
      session,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/drafts/sync`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session.sessionToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          area: draft.details.area,
          categoryId: draft.details.categoryId,
          description: draft.details.description,
          draftId: draft.remoteDraftId || undefined,
          photos: draft.photos.map((photo) => buildPhotoPayload(photo)),
          priceCdf: draft.details.priceCdf,
          title: draft.details.title,
        }),
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible de synchroniser le brouillon.');
      }

      const syncedDraft = await response.json();

      return updateListingDraft(draft, {
        details: {
          area: syncedDraft.area,
          categoryId: syncedDraft.categoryId,
          condition: syncedDraft.condition ?? draft.details.condition,
          description: syncedDraft.description,
          priceCdf: syncedDraft.priceCdf,
          title: syncedDraft.title,
        },
        ownerPhoneNumber: syncedDraft.ownerPhoneNumber,
        photos: mergeSyncedPhotos(draft.photos, syncedDraft.photos ?? []),
        remoteDraftId: syncedDraft.draftId,
        syncStatus: syncedDraft.syncStatus ?? 'synced',
      });
    },

    async publishDraft({
      draft,
      session,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/moderation/publish`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${session.sessionToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          categoryId: draft.details.categoryId,
          description: draft.details.description,
          draftId: draft.remoteDraftId,
          ownerPhoneNumber: draft.ownerPhoneNumber || session.phoneNumber,
          priceCdf: draft.details.priceCdf,
          title: draft.details.title,
        }),
      });

      if (!response.ok) {
        throw await parseError(response, "Impossible d'envoyer l'annonce.");
      }

      return response.json();
    },

    async deleteDraft({
      draftId,
      session,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/drafts/${encodeURIComponent(draftId)}`, {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${session.sessionToken}`,
        },
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible de supprimer le brouillon.');
      }

      return response.json();
    },
  };
}
