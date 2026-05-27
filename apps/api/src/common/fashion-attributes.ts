const fashionItemTypeValues = [
  'shoes',
  'pants',
  'tops',
  'dress_skirt',
  'jacket_sweater',
  'jewelry_ring',
  'jewelry_earrings',
  'jewelry_necklace',
  'jewelry_bracelet',
  'jewelry_watch',
] as const;

export const fashionItemTypeIds = fashionItemTypeValues;

const sharedClothingSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
const ringSizes = ['44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64', '66'] as const;

const fashionSizeOptionsByItemType = {
  dress_skirt: sharedClothingSizes,
  jacket_sweater: sharedClothingSizes,
  pants: ['36', '38', '40', '42', '44', '46', '48', '50'] as const,
  shoes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] as const,
  tops: sharedClothingSizes,
  jewelry_ring: ringSizes,
  jewelry_earrings: [] as const,
  jewelry_necklace: [] as const,
  jewelry_bracelet: [] as const,
  jewelry_watch: [] as const,
} as const;

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSizeValue(value: unknown) {
  const normalizedValue = normalizeString(value);

  if (!normalizedValue) {
    return '';
  }

  if (/^\d+$/.test(normalizedValue)) {
    return normalizedValue;
  }

  return normalizedValue.toUpperCase();
}

export type FashionItemType = (typeof fashionItemTypeValues)[number];

export function isFashionCategory(categoryId: string) {
  return categoryId === 'fashion';
}

export function normalizeFashionItemType(value: unknown): FashionItemType | '' {
  const normalizedValue = normalizeString(value);

  return fashionItemTypeValues.includes(normalizedValue as FashionItemType)
    ? (normalizedValue as FashionItemType)
    : '';
}

export function normalizeFashionSize(itemType: unknown, value: unknown): string {
  const normalizedItemType = normalizeFashionItemType(itemType);

  if (!normalizedItemType) {
    return '';
  }

  const normalizedValue = normalizeSizeValue(value);
  const allowedValues = fashionSizeOptionsByItemType[normalizedItemType] ?? [];

  return allowedValues.includes(normalizedValue as never) ? normalizedValue : '';
}
