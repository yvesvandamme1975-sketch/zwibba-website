export const categoryGuidance = {
  phones_tablets: {
    required: ['face', 'back', 'screen_on'],
    optional: ['accessoires'],
  },
  services: {
    required: [],
    optional: ['carte_visite_logo'],
  },
  emploi: {
    required: [],
    optional: ['logo_entreprise'],
  },
  vehicles: {
    required: ['avant', 'arriere', 'droite', 'gauche', 'interieur'],
    optional: ['tableau_de_bord', 'kilometrage'],
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
