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

function formatPrice(amount, currency) {
  if (amount === null || amount === undefined || amount === '') {
    return currency || '';
  }

  const formattedAmount = new Intl.NumberFormat('fr-FR').format(Number(amount));
  return currency ? `${formattedAmount} ${currency}` : formattedAmount;
}

export function buildListingOgTags({ listing, baseUrl }) {
  const normalizedBaseUrl = String(baseUrl || '').replace(/\/+$/, '');
  const hasStory = Boolean(listing?.storyImageUrl);
  const rawImageUrl =
    listing?.storyImageUrl ||
    listing?.primaryImageUrl ||
    `${normalizedBaseUrl}/assets/brand/og-default.png`;
  const imageUrl = absoluteUrl(rawImageUrl, normalizedBaseUrl);
  const title = listing?.title || 'Annonce Zwibba';
  const slug = listing?.slug || '';
  const currency = listing?.priceCurrency || 'CDF';
  const price = formatPrice(listing?.priceAmount, currency);
  const location = listing?.locationLabel || 'RDC';
  const description = [price, location].filter(Boolean).join(' — ');
  const ogTitle = hasStory ? `Je vends sur Zwibba ! ${title}` : `${title} | Zwibba`;
  const ogUrl = absoluteUrl(`/annonce/${slug}/`, normalizedBaseUrl);

  const tags = [
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'Zwibba'],
    ['property', 'og:locale', 'fr_CD'],
    ['property', 'og:title', ogTitle],
    ['property', 'og:description', description],
    ['property', 'og:url', ogUrl],
    ['property', 'og:image', imageUrl],
  ];

  if (hasStory) {
    tags.push(['property', 'og:image:width', '1080']);
    tags.push(['property', 'og:image:height', '1920']);
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
