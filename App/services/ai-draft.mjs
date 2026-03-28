function createFallbackMessage() {
  return "L'IA n'a pas pu préparer ce brouillon. Continuez manuellement.";
}

function hasCompleteAiDraftPatch(patch) {
  return Boolean(
    patch &&
      typeof patch.title === 'string' &&
      patch.title.trim() &&
      typeof patch.categoryId === 'string' &&
      patch.categoryId.trim() &&
      typeof patch.condition === 'string' &&
      patch.condition.trim() &&
      typeof patch.description === 'string' &&
      patch.description.trim(),
  );
}

async function parseErrorMessage(response, fallbackMessage) {
  try {
    const json = await response.json();
    const message = json?.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  } catch {}

  return fallbackMessage;
}

function mapAiDraftApiResult(response) {
  if (response?.status === 'manual_fallback') {
    return {
      message: response.message || createFallbackMessage(),
      status: 'manual_fallback',
    };
  }

  const draftPatch = mapAiDraftResponse(response?.draftPatch ?? response ?? {});

  if (!hasCompleteAiDraftPatch(draftPatch)) {
    return {
      message: createFallbackMessage(),
      status: 'manual_fallback',
    };
  }

  return {
    draftPatch,
    status: 'ready',
  };
}

export function mapAiDraftResponse(response) {
  return {
    title: response.title ?? '',
    categoryId: response.category_id ?? response.categoryId ?? '',
    condition: response.condition ?? '',
    description: response.description ?? '',
  };
}

export function createAiDraftService({
  apiBaseUrl = '',
  fetchFn = null,
  responder = null,
} = {}) {
  const hasLiveApi = Boolean(apiBaseUrl && typeof fetchFn === 'function');

  return {
    async generateDraft(photo) {
      try {
        let response;

        if (typeof responder === 'function') {
          response = await responder(photo);
        } else if (hasLiveApi) {
          const apiResponse = await fetchFn(`${apiBaseUrl}/ai/draft`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              contentType: photo.contentType ?? '',
              objectKey: photo.objectKey ?? '',
              photoUrl: photo.publicUrl ?? photo.url ?? '',
            }),
          });

          if (!apiResponse.ok) {
            throw new Error(
              await parseErrorMessage(apiResponse, "L'IA n'a pas pu préparer ce brouillon."),
            );
          }

          response = await apiResponse.json();
        } else {
          throw new Error("L'IA n'a pas pu préparer ce brouillon.");
        }

        return mapAiDraftApiResult(response);
      } catch {
        return {
          status: 'manual_fallback',
          message: createFallbackMessage(),
        };
      }
    },
  };
}
