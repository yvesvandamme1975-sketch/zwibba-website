import { formatPrice } from './listing-og.mjs';

const DEFAULT_IMAGE_URL = '/assets/brand/og-default.png';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function endMarker(slot) {
  return `<!--zwibba-live-listings slot="${escapeHtml(slot)}" end-->`;
}

export function buildStartMarker({ slot, market, locale }) {
  return `<!--zwibba-live-listings slot="${escapeHtml(slot)}" market="${escapeHtml(market)}" locale="${escapeHtml(locale)}" start-->`;
}

export function parseStartMarkers(html) {
  const markers = [];
  const pattern =
    /<!--zwibba-live-listings\s+slot="([^"]+)"\s+market="([^"]+)"\s+locale="([^"]+)"\s+start-->/g;
  for (const match of String(html ?? '').matchAll(pattern)) {
    markers.push({ slot: match[1], market: match[2], locale: match[3] });
  }
  return markers;
}

export function renderLiveListingCards({ items = [], categories = [] } = {}) {
  const labelsBySlug = new Map(categories.map((category) => [category.slug, category.label]));

  return items
    .map((item) => {
      const slug = item?.slug || '';
      const title = item?.title || '';
      const categoryId = item?.categoryId || '';
      const categoryLabel = labelsBySlug.get(categoryId) || item?.categoryLabel || '';
      const locationLabel = item?.locationLabel || '';
      const priceAmount = item?.priceAmount ?? '';
      const imageUrl = item?.primaryImageUrl || DEFAULT_IMAGE_URL;
      const price = formatPrice(item?.priceAmount, item?.priceCurrency || 'CDF');

      return `
    <article class="listing-card" data-listing-card data-category="${escapeHtml(categoryId)}" data-condition="" data-price="${escapeHtml(
        priceAmount,
      )}" data-title="${escapeHtml(title.toLowerCase())}" data-published="">
      <a class="listing-card__media" href="/annonce/${escapeHtml(slug)}/">
        <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" width="600" height="400" />
      </a>
      <div class="listing-card__content">
        <div class="listing-card__meta">
          <span>${escapeHtml(categoryLabel)}</span>
          <span>${escapeHtml(locationLabel)}</span>
        </div>
        <h3><a href="/annonce/${escapeHtml(slug)}/">${escapeHtml(title)}</a></h3>
        <p></p>
        <div class="listing-card__footer">
          <strong>${escapeHtml(price)}</strong>
          <span></span>
        </div>
      </div>
    </article>
  `;
    })
    .join('');
}

export function injectLiveListings(html, replacements = {}) {
  let output = String(html ?? '');
  for (const marker of parseStartMarkers(output)) {
    if (!Object.hasOwn(replacements, marker.slot)) {
      continue;
    }
    const start = buildStartMarker(marker);
    const end = endMarker(marker.slot);
    const startIndex = output.indexOf(start);
    if (startIndex === -1) {
      continue;
    }
    const contentStart = startIndex + start.length;
    const endIndex = output.indexOf(end, contentStart);
    if (endIndex === -1) {
      continue;
    }
    output = `${output.slice(0, contentStart)}${replacements[marker.slot]}${output.slice(endIndex)}`;
  }
  return output;
}

export function extractEmptyStateTemplate(html) {
  const match = String(html ?? '').match(/<template\s+data-live-listings-empty>([\s\S]*?)<\/template>/);
  return match ? match[1] : null;
}
