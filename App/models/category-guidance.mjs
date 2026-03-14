export const categoryGuidance = {
  phones_tablets: {
    required: ['face', 'back', 'screen_on'],
    optional: ['accessoires'],
  },
  vehicles: {
    required: ['avant', 'profil', 'interieur', 'tableau_de_bord'],
    optional: ['kilometrage'],
  },
  real_estate: {
    required: ['facade', 'salon', 'chambre', 'cuisine', 'salle_de_bain'],
    optional: [],
  },
  fashion: {
    required: ['vue_ensemble', 'etiquette', 'taille'],
    optional: ['detail'],
  },
  home_garden: {
    required: ['vue_ensemble', 'cote'],
    optional: ['defaut'],
  },
};

export function getCategoryGuidance(categoryId) {
  return categoryGuidance[categoryId] ?? { required: [], optional: [] };
}
