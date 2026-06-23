import { escapeAttribute, escapeHtml, formatListingPrice } from '../../utils/rendering.mjs';
import { sanitizeListingImageUrl } from '../../utils/image-fallbacks.mjs';
import { renderRatingStars } from '../../utils/rating-stars.mjs';
import { sellerMonogram } from '../../utils/seller-monogram.mjs';

function formatMemberSince(value) {
  if (!value) {
    return 'À confirmer';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('fr-FR');
}

function renderSellerListingCard(listing) {
  const imageUrl = sanitizeListingImageUrl(listing.primaryImageUrl, listing);
  const listingHref = listing.slug ? `#listing/${encodeURIComponent(listing.slug)}` : '#buy';

  return `
    <a class="app-home__listing-card" href="${escapeAttribute(listingHref)}">
      ${
        imageUrl
          ? `
            <div class="app-home__listing-media">
              <img
                class="app-home__listing-image"
                src="${escapeAttribute(imageUrl)}"
                alt="${escapeAttribute(listing.title)}"
                loading="lazy"
              />
            </div>
          `
          : '<div class="app-home__listing-media" aria-hidden="true"></div>'
      }
      <div class="app-home__listing-copy">
        <strong>${escapeHtml(listing.title)}</strong>
        <em>${escapeHtml(formatListingPrice(listing))}</em>
        <span>${escapeHtml(listing.locationLabel || 'Localisation à confirmer')}</span>
        <small>${escapeHtml(listing.categoryLabel || 'Annonce active')}</small>
      </div>
    </a>
  `;
}

function formatReviewDate(value) {
  if (!value) {
    return 'Date à confirmer';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('fr-FR');
}

function renderReviewCard(review = {}) {
  const displayName = String(review.buyer?.displayName || '').trim() || 'Acheteur Zwibba';

  return `
    <article class="app-profile__review-card">
      <div class="app-profile__review-head">
        <div class="app-profile__monogram" aria-hidden="true">${escapeHtml(sellerMonogram(displayName))}</div>
        <div>
          <strong>${escapeHtml(displayName)}</strong>
          <span>${escapeHtml(formatReviewDate(review.createdAt))}</span>
        </div>
      </div>
      ${renderRatingStars({
        average: review.rating,
        count: 1,
      })}
      ${
        review.comment
          ? `<p>${escapeHtml(review.comment)}</p>`
          : ''
      }
    </article>
  `;
}

function renderReviewsSection(reviews = []) {
  return `
    <section class="app-home__section">
      <div class="app-home__section-head">
        <h3>Avis</h3>
        <span>${escapeHtml(String(reviews.length))}</span>
      </div>
      ${
        reviews.length
          ? `<div class="app-profile__reviews">${reviews.map(renderReviewCard).join('')}</div>`
          : `
            <article class="app-empty-state">
              <strong>Pas encore d'avis</strong>
              <span>Les avis des acheteurs apparaîtront ici.</span>
            </article>
          `
      }
    </section>
  `;
}

export function renderSellerPublicScreen({
  seller = null,
  listings = [],
  reviews = [],
  state = 'loading',
} = {}) {
  if (state === 'loading') {
    return `
      <section class="app-flow app-screen">
        <header class="app-flow__header">
          <div class="app-flow__meta">
            <a class="app-flow__back" href="#buy">Retour aux annonces</a>
          </div>
          <div>
            <p class="app-flow__eyebrow">Vendeur</p>
            <h2 class="app-flow__title">Chargement du profil</h2>
          </div>
        </header>
      </section>
    `;
  }

  if (state === 'error') {
    return `
      <section class="app-flow app-screen">
        <header class="app-flow__header">
          <div class="app-flow__meta">
            <a class="app-flow__back" href="#buy">Retour aux annonces</a>
          </div>
          <div>
            <p class="app-flow__eyebrow">Vendeur</p>
            <h2 class="app-flow__title">Profil indisponible</h2>
          </div>
        </header>
        <div class="app-review__error-summary">
          <strong>Impossible d’ouvrir ce profil vendeur</strong>
        </div>
      </section>
    `;
  }

  const rawDisplayName = String(seller?.displayName || '').trim();
  const displayName = rawDisplayName || 'Vendeur Zwibba';

  return `
    <section class="app-flow app-screen">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="#buy">Retour aux annonces</a>
        </div>
        <div>
          <p class="app-flow__eyebrow">Vendeur</p>
          <h2 class="app-flow__title">${escapeHtml(displayName)}</h2>
        </div>
      </header>

      <section class="app-home__section app-profile__identity-card">
        <div class="app-profile__identity-head">
          <div class="app-profile__monogram" aria-hidden="true">${escapeHtml(sellerMonogram(rawDisplayName))}</div>
          <div>
            <h3>${escapeHtml(displayName)}</h3>
            <span>Membre depuis ${escapeHtml(formatMemberSince(seller?.memberSince))}</span>
            ${renderRatingStars({
              average: seller?.ratingAverage,
              count: seller?.ratingCount,
            })}
          </div>
        </div>
      </section>

      ${renderReviewsSection(reviews)}

      <section class="app-home__section">
        <div class="app-home__section-head">
          <h3>Annonces actives</h3>
          <span>${escapeHtml(String(listings.length))}</span>
        </div>
        ${
          listings.length
            ? `<div class="app-home__recent-feed">${listings.map(renderSellerListingCard).join('')}</div>`
            : `
              <article class="app-empty-state">
                <strong>Aucune annonce active</strong>
                <span>Ce vendeur n’a pas d’annonce visible pour le moment.</span>
              </article>
            `
        }
      </section>
    </section>
  `;
}
