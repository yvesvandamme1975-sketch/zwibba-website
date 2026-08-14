export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function escapeAttribute(value = '') {
  return escapeHtml(value);
}

export function formatCdf(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return '—';
  }

  return `${new Intl.NumberFormat('fr-FR').format(Number(value))} CDF`;
}

export function formatListingPrice(listingOrPrice) {
  const value =
    typeof listingOrPrice === 'object' && listingOrPrice !== null
      ? listingOrPrice
      : {
          priceAmount: listingOrPrice,
          priceCurrency: 'CDF',
        };
  const rawAmount =
    value.priceAmount ?? value.amount ?? value.priceCdf ?? value.price ?? null;
  const rawCurrency =
    value.priceCurrency === 'USD' || value.currency === 'USD'
      ? 'USD'
      : value.priceCurrency === 'EUR' || value.currency === 'EUR'
        ? 'EUR'
        : rawAmount != null
          ? 'CDF'
          : '';

  if (rawAmount == null || Number.isNaN(Number(rawAmount))) {
    if (typeof value.priceLabel === 'string' && value.priceLabel.trim()) {
      return value.priceLabel;
    }

    return '—';
  }

  if (Number(rawAmount) === 0) {
    return 'À donner';
  }

  const groupedValue = new Intl.NumberFormat('fr-FR')
    .format(Number(rawAmount))
    .replaceAll(/\s/gu, ' ');

  const suffix = rawCurrency === 'USD' ? 'US$' : rawCurrency === 'EUR' ? '€' : 'CDF';
  return `${groupedValue} ${suffix}`;
}
