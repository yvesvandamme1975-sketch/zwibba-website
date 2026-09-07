function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function absoluteUrl(value, baseUrl) {
  return new URL(value, baseUrl).toString();
}

export function formatPrice(amount, currency) {
  if (amount === null || amount === undefined || amount === '') {
    return currency || '';
  }

  if (currency === 'EUR') {
    const formattedAmount = new Intl.NumberFormat('fr-BE').format(Number(amount));
    return `${formattedAmount} €`;
  }

  if (currency === 'USD') {
    const formattedAmount = new Intl.NumberFormat('fr-FR').format(Number(amount));
    return `${formattedAmount} US$`;
  }

  const formattedAmount = new Intl.NumberFormat('fr-FR').format(Number(amount));
  return currency ? `${formattedAmount} ${currency}` : formattedAmount;
}

export function buildListingOgTags({ listing, baseUrl }) {
  const normalizedBaseUrl = String(baseUrl || '').replace(/\/+$/, '');
  const hasLandscape = Boolean(listing?.shareImageUrl);
  const isBelgium = listing?.countryCode === 'BE' || (!listing?.countryCode && listing?.priceCurrency === 'EUR');
  const rawImageUrl =
    listing?.shareImageUrl ||
    listing?.primaryImageUrl ||
    `${normalizedBaseUrl}/assets/brand/og-default.png`;
  const imageUrl = absoluteUrl(rawImageUrl, normalizedBaseUrl);
  const title = listing?.title || 'Annonce Zwibba';
  const slug = listing?.slug || '';
  const currency = listing?.priceCurrency || (isBelgium ? 'EUR' : 'CDF');
  const price = formatPrice(listing?.priceAmount, currency);
  const location = listing?.locationLabel || (isBelgium ? 'Belgique' : 'RDC');
  const description = [price, location].filter(Boolean).join(' — ');
  const ogTitle = `${title} | Zwibba`;
  const ogUrl = absoluteUrl(`/annonce/${slug}/`, normalizedBaseUrl);

  const tags = [
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'Zwibba'],
    ['property', 'og:locale', isBelgium ? 'fr_BE' : 'fr_CD'],
    ['property', 'og:title', ogTitle],
    ['property', 'og:description', description],
    ['property', 'og:url', ogUrl],
    ['property', 'og:image', imageUrl],
  ];

  if (hasLandscape) {
    tags.push(['property', 'og:image:width', '1200']);
    tags.push(['property', 'og:image:height', '630']);
  }

  tags.push(['property', 'product:price:amount', listing?.priceAmount ?? '']);
  tags.push(['property', 'product:price:currency', currency]);
  tags.push(['name', 'twitter:card', 'summary_large_image']);
  tags.push(['name', 'twitter:title', ogTitle]);
  tags.push(['name', 'twitter:description', description]);
  tags.push(['name', 'twitter:image', imageUrl]);

  return tags
    .map(
      ([attributeName, attributeValue, content]) =>
        `<meta ${attributeName}="${escapeHtml(attributeValue)}" content="${escapeHtml(content)}" />`,
    )
    .join('\n');
}
