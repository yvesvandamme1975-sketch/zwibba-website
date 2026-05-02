import { normalizePriceCurrency, parsePriceInput } from './price-input.mjs';
import { isFashionCategory, updateFashionAttributes } from './fashion-attributes.mjs';

export function buildReviewDraftDetails({
  existingDetails = {},
  profileArea = '',
  values = {},
} = {}) {
  const categoryId = String(values.categoryId ?? '').trim();
  const priceCurrency = normalizePriceCurrency(values.priceCurrency);
  const fashionAttributes = isFashionCategory(categoryId)
    ? updateFashionAttributes(existingDetails.attributesJson, {
        itemType: values.fashionItemType,
        size: values.fashionSize,
      })
    : updateFashionAttributes(existingDetails.attributesJson);

  return {
    title: String(values.title ?? '').trim(),
    categoryId,
    condition: String(values.condition ?? '').trim(),
    attributesJson: fashionAttributes,
    priceAmount: parsePriceInput(values.priceAmount),
    priceCurrency,
    description: String(values.description ?? '').trim(),
    area: String(profileArea || existingDetails.area || '').trim(),
  };
}
