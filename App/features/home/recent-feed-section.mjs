import {
  escapeAttribute,
  escapeHtml,
  formatCdf,
} from '../../utils/rendering.mjs';
import {
  buildImageFallbackHandler,
  sanitizeListingImageUrl,
} from '../../utils/image-fallbacks.mjs';

function renderListingCard(listing) {
  const priceLabel = listing.priceLabel ?? formatCdf(listing.priceCdf);
  const locationLabel = listing.location ?? listing.locationLabel ?? 'Localisation à confirmer';
  const publishedAt = listing.publishedAt ?? listing.categoryLabel ?? 'Disponible maintenant';
  const listingHref = listing.slug ? `#listing/${encodeURIComponent(listing.slug)}` : '#home';
  const imageFallback = buildImageFallbackHandler({
    categoryId: listing.categoryId,
    categoryLabel: listing.categoryLabel,
  });
  const imageUrl = sanitizeListingImageUrl(listing.primaryImageUrl, {
    categoryId: listing.categoryId,
    categoryLabel: listing.categoryLabel,
  });
  const mediaMarkup = imageUrl
    ? `
        <div class="app-home__listing-media">
          <img
            class="app-home__listing-image"
            src="${escapeAttribute(imageUrl)}"
            alt="${escapeAttribute(listing.title)}"
            loading="lazy"
            onerror="${escapeAttribute(imageFallback)}"
          />
        </div>
      `
    : '<div class="app-home__listing-media" aria-hidden="true"></div>';

  return `
    <a class="app-home__listing-card" href="${escapeAttribute(listingHref)}">
      ${mediaMarkup}
      <div class="app-home__listing-copy">
        <strong>${escapeHtml(listing.title)}</strong>
        <em>${escapeHtml(priceLabel)}</em>
        <span>${escapeHtml(locationLabel)}</span>
        <small>${escapeHtml(publishedAt)}</small>
      </div>
    </a>
  `;
}

function renderFeedBody({
  emptyMessage,
  listings,
  loadingMessage,
  sectionClassName,
  status,
}) {
  if (status === 'loading') {
    return `<div class="${sectionClassName} app-home__feed-state">Chargement des annonces...${loadingMessage ? ` ${escapeHtml(loadingMessage)}` : ''}</div>`;
  }

  if (!listings.length) {
    return `<div class="${sectionClassName} app-home__feed-state">${escapeHtml(emptyMessage)}</div>`;
  }

  return `<div class="${sectionClassName}">${listings.map(renderListingCard).join('')}</div>`;
}

export function renderRecentFeedSection({
  listings,
  status = 'ready',
}) {
  return `
    <section class="app-home__section" data-recent-feed-section>
      <div class="app-home__section-head">
        <h3>Récent</h3>
        <span>Flux acheteur</span>
      </div>
      ${renderFeedBody({
        emptyMessage: 'Aucune annonce ne correspond à vos filtres pour le moment.',
        listings,
        sectionClassName: 'app-home__recent-feed',
        status,
      })}
    </section>
  `;
}

export function renderFeaturedSection({
  listings,
  status = 'ready',
}) {
  return `
    <section class="app-home__section">
      <div class="app-home__section-head">
        <h3>En avant</h3>
        <span>À découvrir</span>
      </div>
      ${renderFeedBody({
        emptyMessage: 'Aucune annonce mise en avant pour ces filtres.',
        listings,
        sectionClassName: 'app-home__featured-row',
        status,
      })}
    </section>
  `;
}
