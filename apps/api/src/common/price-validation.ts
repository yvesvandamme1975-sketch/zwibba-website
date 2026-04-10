import { BadRequestException } from '@nestjs/common';

export const MAX_PRICE_CDF = 2_147_483_647;
export const MAX_LISTING_PRICE_AMOUNT = MAX_PRICE_CDF;
export type ListingPriceCurrency = 'CDF' | 'USD';

export function normalizeListingPriceCurrency(
  currency: unknown,
): ListingPriceCurrency | null {
  if (currency === 'CDF' || currency === 'USD') {
    return currency;
  }

  return null;
}

export function formatListingPrice({
  priceAmount,
  priceCurrency,
}: {
  priceAmount: number;
  priceCurrency: ListingPriceCurrency;
}) {
  const suffix = priceCurrency === 'USD' ? 'US$' : 'CDF';

  return `${new Intl.NumberFormat('fr-FR').format(priceAmount)} ${suffix}`;
}

export function resolveSubmittedListingPrice({
  priceAmount,
  priceCurrency,
  priceCdf,
}: {
  priceAmount?: number | null;
  priceCurrency?: unknown;
  priceCdf?: number | null;
}) {
  const normalizedCurrency = normalizeListingPriceCurrency(priceCurrency);

  if (
    Number.isInteger(priceCdf) &&
    priceCdf != null &&
    (normalizedCurrency !== 'USD' || !Number.isInteger(priceAmount))
  ) {
    return assertSupportedListingPrice({
      priceAmount: priceCdf,
      priceCurrency: 'CDF',
    });
  }

  if (typeof priceAmount === 'number' && Number.isInteger(priceAmount) && normalizedCurrency) {
    return assertSupportedListingPrice({
      priceAmount,
      priceCurrency: normalizedCurrency,
    });
  }

  return assertSupportedListingPrice({
    priceAmount: priceCdf ?? 0,
    priceCurrency: 'CDF',
  });
}

export function assertSupportedListingPrice({
  priceAmount,
  priceCurrency,
}: {
  priceAmount: number;
  priceCurrency: ListingPriceCurrency;
}) {
  if (!Number.isInteger(priceAmount) || priceAmount <= 0) {
    throw new BadRequestException('Le prix final doit être confirmé avant publication.');
  }

  if (priceAmount > MAX_LISTING_PRICE_AMOUNT) {
    throw new BadRequestException(
      `Le prix final doit rester inférieur à ${formatListingPrice({
        priceAmount: MAX_LISTING_PRICE_AMOUNT,
        priceCurrency,
      })}.`,
    );
  }

  return {
    legacyPriceCdf: priceAmount,
    priceAmount,
    priceCurrency,
  };
}

export function assertSupportedPriceCdf(priceCdf: number) {
  return assertSupportedListingPrice({
    priceAmount: priceCdf,
    priceCurrency: 'CDF',
  }).priceAmount;
}
