const capturePreviewById = {
  'phone-front': '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.svg',
  'sofa-showroom': '/assets/listings/canape-3-places-style-contemporain.svg',
  'vehicle-front': '/assets/listings/toyota-hilux-2019-4x4.svg',
};

const categoryPreviewById = {
  electronics: '/assets/listings/ordinateur-portable-hp-elitebook.svg',
  fashion: '/assets/listings/robe-wax-africaine-taille-m.svg',
  home_garden: '/assets/listings/canape-3-places-style-contemporain.svg',
  phones_tablets: '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.svg',
  real_estate: '/assets/listings/appartement-2-chambres-quartier-industriel.svg',
  vehicles: '/assets/listings/toyota-hilux-2019-4x4.svg',
};

const defaultPreviewUrl = capturePreviewById['phone-front'];

export function resolveDemoPreviewUrl(presetId = '', categoryId = '') {
  return capturePreviewById[presetId] || categoryPreviewById[categoryId] || defaultPreviewUrl;
}
