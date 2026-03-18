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

export function createMediaService({
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
    async requestUploadSlot({
      contentType,
      fileName,
      sourcePresetId,
    }) {
      const response = await fetchFn(`${apiBaseUrl}/media/upload-url`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          contentType,
          fileName,
          sourcePresetId,
        }),
      });

      if (!response.ok) {
        throw await parseError(response, 'Impossible de préparer le média.');
      }

      return response.json();
    },

    async uploadBytes({
      bytes,
      contentType,
      uploadUrl,
    }) {
      const response = await fetchFn(uploadUrl, {
        method: 'PUT',
        headers: {
          'content-type': contentType,
        },
        body: bytes,
      });

      if (!response.ok) {
        throw createHttpError('Impossible de téléverser la photo.', response.status);
      }
    },
  };
}
