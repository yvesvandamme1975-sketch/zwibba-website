import { normalizeMarketCountryCode } from '../auth/phone-country';

type SearchQueryEventInput = {
  countryCode: unknown;
  rawQuery: unknown;
  resultCount: unknown;
  selectedCategoryId?: unknown;
};

export function normalizeSearchQuery(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildSearchQueryEventInput(input: SearchQueryEventInput) {
  const rawQuery =
    typeof input.rawQuery === 'string'
      ? input.rawQuery.trim().slice(0, 120)
      : '';
  const normalizedQuery = normalizeSearchQuery(rawQuery);

  if (
    normalizedQuery.length === 0 ||
    !Number.isFinite(input.resultCount) ||
    !Number.isInteger(input.resultCount) ||
    (input.resultCount as number) < 0
  ) {
    return null;
  }

  const countryCodeValue =
    typeof input.countryCode === 'string'
      ? input.countryCode.toUpperCase()
      : input.countryCode;

  return {
    countryCode: normalizeMarketCountryCode(countryCodeValue),
    normalizedQuery,
    rawQuery,
    resultCount: input.resultCount as number,
    selectedCategoryId:
      typeof input.selectedCategoryId === 'string'
        ? input.selectedCategoryId
        : '',
  };
}
