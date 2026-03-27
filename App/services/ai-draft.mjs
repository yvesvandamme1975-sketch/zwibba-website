function createFallbackMessage() {
  return "L'IA n'a pas pu préparer ce brouillon. Continuez manuellement.";
}

function mapPhotoToDraft(photo) {
  if (photo.id?.includes('vehicle')) {
    return {
      title: 'Toyota RAV4 automatique',
      category_id: 'vehicles',
      condition: 'used_good',
      description: 'SUV propre avec carnet et climatisation.',
    };
  }

  if (photo.id?.includes('sofa')) {
    return {
      title: 'Canapé trois places',
      category_id: 'home_garden',
      condition: 'used_good',
      description: 'Canapé confortable, tissu propre, parfait pour salon.',
    };
  }

  return {
    title: 'Samsung Galaxy A54 128 Go',
    category_id: 'phones_tablets',
    condition: 'like_new',
    description: 'Téléphone propre avec boîte et chargeur.',
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
  responder = async (photo) => mapPhotoToDraft(photo),
} = {}) {
  return {
    async generateDraft(photo) {
      try {
        const response = await responder(photo);

        return {
          status: 'ready',
          draftPatch: mapAiDraftResponse(response),
        };
      } catch {
        return {
          status: 'manual_fallback',
          message: createFallbackMessage(),
        };
      }
    },
  };
}
