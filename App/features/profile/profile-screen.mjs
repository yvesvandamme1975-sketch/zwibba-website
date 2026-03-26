import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { escapeAttribute, escapeHtml, formatCdf } from '../../utils/rendering.mjs';
import { sanitizeListingImageUrl } from '../../utils/image-fallbacks.mjs';

function buildCounts(listings) {
  return {
    approved: listings.filter((listing) => listing.moderationStatus === 'approved').length,
    blocked: listings.filter((listing) => listing.moderationStatus === 'blocked_needs_fix').length,
    pending: listings.filter((listing) => listing.moderationStatus === 'pending_manual_review').length,
  };
}

function formatListingStatus(status) {
  switch (status) {
    case 'approved':
      return 'Publiée';
    case 'pending_manual_review':
      return 'En revue';
    case 'blocked_needs_fix':
      return 'À corriger';
    default:
      return 'Brouillon';
  }
}

function renderListingCard(listing) {
  const imageUrl = sanitizeListingImageUrl(listing.primaryImageUrl, listing);

  return `
    <article class="app-profile__listing-card" data-listing-id="${escapeAttribute(listing.id)}">
      ${
        imageUrl
          ? `<img class="app-profile__listing-image" src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(listing.title)}" loading="lazy" />`
          : '<div class="app-profile__listing-image app-profile__listing-image--placeholder" aria-hidden="true"></div>'
      }
      <div class="app-profile__listing-copy">
        <strong>${escapeHtml(listing.title)}</strong>
        <span>${escapeHtml(formatListingStatus(listing.moderationStatus))}</span>
        <em>${escapeHtml(formatCdf(listing.priceCdf))}</em>
      </div>
      <div class="app-profile__listing-actions">
        <a class="app-flow__button app-flow__button--secondary" href="#listing/${escapeAttribute(listing.slug)}">Voir</a>
        <button
          class="app-flow__button"
          type="button"
          data-action="activate-boost"
          data-listing-id="${escapeAttribute(listing.id)}"
        >
          Booster
        </button>
      </div>
    </article>
  `;
}

export function renderProfileScreen({
  listings = [],
  session = null,
  state = 'loading',
} = {}) {
  if (state === 'locked' || !session) {
    return `
      <section class="app-flow app-screen">
        <header class="app-flow__header">
          <div class="app-flow__meta">
            ${renderInAppBrand({ compact: true })}
          </div>
          <div>
            <p class="app-flow__eyebrow">Profil</p>
            <h2 class="app-flow__title">Connectez votre session vendeur</h2>
          </div>
        </header>

        <div class="app-auth__card">
          <strong>Profil verrouillé</strong>
          <p>La vérification active vos annonces, votre messagerie et votre portefeuille test.</p>
        </div>

        <div class="app-flow__actions">
          <a
            class="app-flow__button"
            href="#auth-welcome"
            data-action="begin-auth"
            data-intent="profile"
            data-return-route="#profile"
          >
            Commencer la vérification
          </a>
        </div>
      </section>
    `;
  }

  const counts = buildCounts(listings);

  return `
    <section class="app-flow app-screen">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Profil</p>
          <h2 class="app-flow__title">Mon profil</h2>
        </div>
      </header>

      <div class="app-publish__status is-verified">
        <strong>${escapeHtml(session.phoneNumber)}</strong>
        <span>Session vérifiée</span>
      </div>

      <div class="app-profile__stats">
        <article><strong>Publiées</strong><span>${escapeHtml(String(counts.approved))}</span></article>
        <article><strong>En revue</strong><span>${escapeHtml(String(counts.pending))}</span></article>
        <article><strong>À corriger</strong><span>${escapeHtml(String(counts.blocked))}</span></article>
      </div>

      <section class="app-home__section">
        <div class="app-home__section-head">
          <h3>Mes annonces</h3>
          <span>Gestion vendeur</span>
        </div>
        <div class="app-profile__listing-grid">
          ${listings.map(renderListingCard).join('')}
        </div>
      </section>
    </section>
  `;
}
