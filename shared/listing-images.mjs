export const seededListingImagesBySlug = {
  'appartement-2-chambres-quartier-industriel': {
    src: '/assets/listings/appartement-2-chambres-quartier-industriel.jpg',
    alt: 'Appartement lumineux de deux chambres avec salon et lumière naturelle.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/apartment-interior-7746646/',
    },
  },
  'canape-3-places-style-contemporain': {
    src: '/assets/listings/canape-3-places-style-contemporain.jpg',
    alt: 'Canapé trois places dans un salon contemporain et lumineux.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/cozy-modern-living-room-with-stylish-sofa-30778652/',
    },
  },
  'mangues-et-avocats-frais-du-haut-katanga': {
    src: '/assets/listings/mangues-et-avocats-frais-du-haut-katanga.jpg',
    alt: 'Mangues et avocats frais présentés sur une assiette.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/avocados-and-mangoes-on-a-plate-10023042/',
    },
  },
  'lot-ciment-outils-chantier-lubumbashi': {
    src: '/assets/listings/lot-ciment-outils-chantier-lubumbashi.jpg',
    alt: 'Ouvrier en train de lisser du béton sur un chantier extérieur.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/a-person-constructing-a-road-4134382/',
    },
  },
  'ordinateur-portable-hp-elitebook': {
    src: '/assets/listings/ordinateur-portable-hp-elitebook.jpg',
    alt: 'Ordinateur portable posé sur un bureau de travail en bois.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/laptop-placed-on-top-of-a-wooden-work-desk-8472374/',
    },
  },
  'offre-receptionniste-lubumbashi-centre': {
    src: '/assets/listings/offre-receptionniste-lubumbashi-centre.jpg',
    alt: 'Accueil professionnel avec ordinateur et cahier de rendez-vous dans un bureau lumineux.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/laptop-placed-on-top-of-a-wooden-work-desk-8472374/',
    },
  },
  'pack-fournitures-scolaires-universitaires': {
    src: '/assets/listings/pack-fournitures-scolaires-universitaires.jpg',
    alt: 'Fournitures scolaires et universitaires disposées sur un bureau clair.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/arranged-pastel-colored-school-supplies-6192765/',
    },
  },
  'pulverisateur-agricole-16l-lubumbashi': {
    src: '/assets/listings/pulverisateur-agricole-16l-lubumbashi.jpg',
    alt: 'Tracteur agricole au travail dans un champ sec en zone rurale.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/tractor-on-rural-field-21711155/',
    },
  },
  'robe-wax-africaine-taille-m': {
    src: '/assets/listings/robe-wax-africaine-taille-m.jpg',
    alt: 'Robe wax africaine portée en extérieur avec motifs colorés.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/portrait-of-a-woman-in-traditional-african-attire-33725837/',
    },
  },
  'samsung-galaxy-a54-neuf-lubumbashi': {
    src: '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.jpg',
    alt: 'Samsung Galaxy A54 neuf présenté dans sa boîte.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/close-up-of-modern-smartphone-in-box-32171277/',
    },
  },
  'service-plomberie-urgence-7j7': {
    src: '/assets/listings/service-plomberie-urgence-7j7.jpg',
    alt: 'Plombier en intervention avec une clé sur une installation intérieure.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/plumber-repairing-pipe-with-wrench-indoors-32588548/',
    },
  },
  'toyota-hilux-2019-4x4': {
    src: '/assets/listings/toyota-hilux-2019-4x4.jpg',
    alt: 'Pickup tout-terrain stationné sur une route de campagne.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/pickup-truck-on-road-18375383/',
    },
  },
  'velo-fitness-loisir-lubumbashi': {
    src: '/assets/listings/velo-fitness-loisir-lubumbashi.jpg',
    alt: 'Vélo de route sur support d’entraînement dans un espace sport minimaliste.',
    credit: {
      provider: 'Pexels',
      pageUrl: 'https://www.pexels.com/photo/black-bike-on-a-bike-stand-10347812/',
    },
  },
};

const seededPreviewSlugByCategory = {
  agriculture: 'pulverisateur-agricole-16l-lubumbashi',
  construction: 'lot-ciment-outils-chantier-lubumbashi',
  education: 'pack-fournitures-scolaires-universitaires',
  emploi: 'offre-receptionniste-lubumbashi-centre',
  electronics: 'ordinateur-portable-hp-elitebook',
  fashion: 'robe-wax-africaine-taille-m',
  food: 'mangues-et-avocats-frais-du-haut-katanga',
  home_garden: 'canape-3-places-style-contemporain',
  services: 'service-plomberie-urgence-7j7',
  sports_leisure: 'velo-fitness-loisir-lubumbashi',
  phones_tablets: 'samsung-galaxy-a54-neuf-lubumbashi',
  real_estate: 'appartement-2-chambres-quartier-industriel',
  vehicles: 'toyota-hilux-2019-4x4',
};

const seededPreviewSlugByCaptureId = {
  'phone-front': 'samsung-galaxy-a54-neuf-lubumbashi',
  'sofa-showroom': 'canape-3-places-style-contemporain',
  'vehicle-front': 'toyota-hilux-2019-4x4',
};

export function resolveSeededListingImage(slug = '') {
  return seededListingImagesBySlug[String(slug || '').trim()] || null;
}

export function resolveSeededListingImageUrl(slug = '') {
  return resolveSeededListingImage(slug)?.src || '';
}

export function resolveSeededCategoryPreviewImage(categoryId = '') {
  const previewSlug = seededPreviewSlugByCategory[String(categoryId || '').trim()];

  return previewSlug ? resolveSeededListingImage(previewSlug) : null;
}

export function resolveSeededCategoryPreviewImageUrl(categoryId = '') {
  return resolveSeededCategoryPreviewImage(categoryId)?.src || '';
}

export function resolveSeededCapturePreviewImageUrl(presetId = '') {
  const previewSlug = seededPreviewSlugByCaptureId[String(presetId || '').trim()];

  return previewSlug ? resolveSeededListingImageUrl(previewSlug) : '';
}
