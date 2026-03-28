function createFallbackMessage() {
  return "L'IA n'a pas pu préparer ce brouillon. Continuez manuellement.";
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

  return {
    draftPatch: mapAiDraftResponse(response?.draftPatch ?? response ?? {}),
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
