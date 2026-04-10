import { resolveDemoPreviewUrl } from '../demo-preview-assets.mjs';

const categoryIdByLabel = {
  'agriculture': 'agriculture',
  'alimentation': 'food',
  'construction': 'construction',
  'ecole / universite': 'education',
  'ecole/universite': 'education',
  'electronique': 'electronics',
  'emploi': 'emploi',
  'emplois': 'emploi',
  'immobilier': 'real_estate',
  'maison': 'home_garden',
  'mode': 'fashion',
  'services': 'services',
  'sports et loisirs': 'sports_leisure',
  'sports & loisirs': 'sports_leisure',
  'telephones': 'phones_tablets',
  'telephones & tablettes': 'phones_tablets',
  'vehicules': 'vehicles',
};

function normalizeCategoryLabel(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function resolveCategoryPreviewUrl({
  categoryId = '',
  categoryLabel = '',
} = {}) {
  const normalizedLabel = normalizeCategoryLabel(categoryLabel);
  const resolvedCategoryId = categoryId || categoryIdByLabel[normalizedLabel] || 'phones_tablets';

  return resolveDemoPreviewUrl('', resolvedCategoryId);
}

export function buildImageFallbackHandler(image = {}) {
  const fallbackUrl = resolveCategoryPreviewUrl(image);

  return `this.onerror=null;this.src='${fallbackUrl}';`;
}

export function sanitizeListingImageUrl(imageUrl = '', image = {}) {
  const normalizedUrl = String(imageUrl || '').trim();

  if (!normalizedUrl) {
    return '';
  }

  if (/^https:\/\/cdn\.zwibba\.example\//i.test(normalizedUrl)) {
    return resolveCategoryPreviewUrl(image);
  }

  return normalizedUrl;
}
