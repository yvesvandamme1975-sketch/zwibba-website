const fashionItemTypeOptions = [
  { value: 'shoes', label: 'Chaussures' },
  { value: 'pants', label: 'Pantalon' },
  { value: 'tops', label: 'T-shirt / Chemise' },
  { value: 'dress_skirt', label: 'Robe / Jupe' },
  { value: 'jacket_sweater', label: 'Veste / Pull' },
  { value: 'jewelry_ring', label: 'Bague' },
  { value: 'jewelry_earrings', label: "Boucles d'oreilles" },
  { value: 'jewelry_necklace', label: 'Collier' },
  { value: 'jewelry_bracelet', label: 'Bracelet' },
  { value: 'jewelry_watch', label: 'Montre' },
];

const sharedClothingSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const ringSizes = ['44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64', '66'];

const fashionSizeOptionsByItemType = {
  dress_skirt: sharedClothingSizes,
  jacket_sweater: sharedClothingSizes,
  pants: ['36', '38', '40', '42', '44', '46', '48', '50'],
  shoes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
  tops: sharedClothingSizes,
  jewelry_ring: ringSizes,
  jewelry_earrings: [],
  jewelry_necklace: [],
  jewelry_bracelet: [],
  jewelry_watch: [],
};

const fashionItemTypeLabels = Object.fromEntries(
  fashionItemTypeOptions.map((option) => [option.value, option.label]),
);

function normalizeSizeValue(rawValue = '') {
  const normalizedValue = String(rawValue ?? '').trim();

  if (!normalizedValue) {
    return '';
  }

  if (/^\d+$/.test(normalizedValue)) {
    return normalizedValue;
  }

  return normalizedValue.toUpperCase();
}

export function isFashionCategory(categoryId = '') {
  return categoryId === 'fashion';
}

export function normalizeFashionItemType(rawValue = '') {
  const normalizedValue = String(rawValue ?? '').trim();

  return fashionItemTypeLabels[normalizedValue] ? normalizedValue : '';
}

export function getFashionItemTypeOptions() {
  return fashionItemTypeOptions.map((option) => ({ ...option }));
}

export function getFashionItemTypeLabel(itemType = '') {
  return fashionItemTypeLabels[normalizeFashionItemType(itemType)] ?? '';
}

export function getFashionSizeOptions(itemType = '') {
  const normalizedItemType = normalizeFashionItemType(itemType);
  const values = fashionSizeOptionsByItemType[normalizedItemType] ?? [];

  return values.map((value) => ({
    label: value,
    value,
  }));
}

export function normalizeFashionSize(itemType = '', rawValue = '') {
  const normalizedItemType = normalizeFashionItemType(itemType);

  if (!normalizedItemType) {
    return '';
  }

  const normalizedValue = normalizeSizeValue(rawValue);

  return fashionSizeOptionsByItemType[normalizedItemType]?.includes(normalizedValue)
    ? normalizedValue
    : '';
}

export function normalizeListingAttributesJson(rawAttributesJson) {
  if (
    !rawAttributesJson ||
    typeof rawAttributesJson !== 'object' ||
    Array.isArray(rawAttributesJson)
  ) {
    return null;
  }

  const nextAttributes = { ...rawAttributesJson };
  const normalizedItemType = normalizeFashionItemType(nextAttributes?.fashion?.itemType);

  if (!normalizedItemType) {
    delete nextAttributes.fashion;
    return Object.keys(nextAttributes).length ? nextAttributes : null;
  }

  nextAttributes.fashion = {
    itemType: normalizedItemType,
    size: normalizeFashionSize(normalizedItemType, nextAttributes?.fashion?.size),
  };

  return nextAttributes;
}

export function getFashionAttributes(attributesJson) {
  const normalizedAttributes = normalizeListingAttributesJson(attributesJson);
  const fashionAttributes = normalizedAttributes?.fashion ?? {};

  return {
    itemType: normalizeFashionItemType(fashionAttributes.itemType),
    size: normalizeFashionSize(fashionAttributes.itemType, fashionAttributes.size),
  };
}

export function updateFashionAttributes(
  attributesJson,
  {
    itemType = '',
    size = '',
  } = {},
) {
  const normalizedAttributes = normalizeListingAttributesJson(attributesJson);
  const nextAttributes = normalizedAttributes
    ? Object.fromEntries(Object.entries(normalizedAttributes).filter(([key]) => key !== 'fashion'))
    : {};
  const normalizedItemType = normalizeFashionItemType(itemType);

  if (!normalizedItemType) {
    return Object.keys(nextAttributes).length ? nextAttributes : null;
  }

  return {
    ...nextAttributes,
    fashion: {
      itemType: normalizedItemType,
      size: normalizeFashionSize(normalizedItemType, size),
    },
  };
}
