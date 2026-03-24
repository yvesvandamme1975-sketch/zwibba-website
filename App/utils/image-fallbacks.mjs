import { resolveDemoPreviewUrl } from '../demo-preview-assets.mjs';

const categoryIdByLabel = {
  'électronique': 'electronics',
  'immobilier': 'real_estate',
  'maison': 'home_garden',
  'mode': 'fashion',
  'téléphones': 'phones_tablets',
  'téléphones & tablettes': 'phones_tablets',
  'véhicules': 'vehicles',
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
