import { normalizeMarketCountryCode } from '../auth/phone-country';

type PriceValue = {
  amount: number;
  currency: string;
};

type PriceEventInput = {
  countryCode: unknown;
  draftId: string;
  listingId: string | null;
  previous: PriceValue | null;
  next: PriceValue;
  source: string;
};

export function derivePriceEventInput({
  countryCode,
  draftId,
  listingId,
  previous,
  next,
  source,
}: PriceEventInput) {
  if (
    previous &&
    previous.amount === next.amount &&
    previous.currency === next.currency
  ) {
    return null;
  }

  const countryCodeValue =
    typeof countryCode === 'string' ? countryCode.toUpperCase() : countryCode;

  return {
    countryCode: normalizeMarketCountryCode(countryCodeValue),
    draftId,
    listingId,
    previousAmount: previous?.amount ?? null,
    previousCurrency: previous?.currency ?? null,
    nextAmount: next.amount,
    nextCurrency: next.currency,
    source,
  };
}
