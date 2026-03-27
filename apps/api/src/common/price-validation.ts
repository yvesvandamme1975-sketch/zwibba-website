import { BadRequestException } from '@nestjs/common';

export const MAX_PRICE_CDF = 2_147_483_647;

function formatCdf(value: number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} CDF`;
}

export function assertSupportedPriceCdf(priceCdf: number) {
  if (!Number.isInteger(priceCdf) || priceCdf <= 0) {
    throw new BadRequestException('Le prix final doit être confirmé avant publication.');
  }

  if (priceCdf > MAX_PRICE_CDF) {
    throw new BadRequestException(
      `Le prix final doit rester inférieur à ${formatCdf(MAX_PRICE_CDF)}.`,
    );
  }

  return priceCdf;
}
