export const MAX_DISPLAY_NAME_LENGTH = 40;

export function resolveDisplayNameForSubmit({ displayName } = {}) {
  const value = String(displayName ?? '').trim();

  if (!value) {
    return { ok: false, error: 'Choisissez un nom vendeur.' };
  }

  if (value.length > MAX_DISPLAY_NAME_LENGTH) {
    return {
      ok: false,
      error: `Le nom vendeur doit contenir ${MAX_DISPLAY_NAME_LENGTH} caractères maximum.`,
    };
  }

  return { ok: true, value };
}
