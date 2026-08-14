function normalizeCurrency(currency) {
  return String(currency || '').trim().toUpperCase();
}

function normalizePrice(price) {
  const value = Number(price);
  return Number.isFinite(value) ? value : 0;
}

export function compareListingsByPrice(left, right, { localCurrency = 'CDF', direction = 'asc' } = {}) {
  const normalizedLocalCurrency = normalizeCurrency(localCurrency);
  const leftCurrency = normalizeCurrency(left?.currency);
  const rightCurrency = normalizeCurrency(right?.currency);
  const leftLocalRank = leftCurrency === normalizedLocalCurrency ? 0 : 1;
  const rightLocalRank = rightCurrency === normalizedLocalCurrency ? 0 : 1;

  if (leftLocalRank !== rightLocalRank) {
    return leftLocalRank - rightLocalRank;
  }

  const amountDirection = direction === 'desc' ? -1 : 1;
  const priceDelta = normalizePrice(left?.price) - normalizePrice(right?.price);

  if (priceDelta !== 0) {
    return priceDelta * amountDirection;
  }

  return leftCurrency.localeCompare(rightCurrency);
}
