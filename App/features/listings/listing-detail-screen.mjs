import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import {
  escapeAttribute,
  escapeHtml,
  formatCdf,
} from '../../utils/rendering.mjs';
import {
  buildImageFallbackHandler,
  sanitizeListingImageUrl,
} from '../../utils/image-fallbacks.mjs';

const categoryLabels = {
  emploi: 'Emploi',
  electronics: 'Électronique',
  fashion: 'Mode',
  home_garden: 'Maison',
  phones_tablets: 'Téléphones & Tablettes',
  real_estate: 'Immobilier',
  services: 'Services',
  vehicles: 'Véhicules',
};

function buildBuyerMessage(detail) {
  return `Bonjour, je suis intéressé par ${detail.title} sur Zwibba.`;
}

function buildActionMarkup(action, detail) {
  switch (action) {
    case 'message':
      return `
        <button
          class="app-flow__button"
          type="button"
          data-action="start-thread"
          data-listing-id="${escapeAttribute(detail.id)}"
          data-listing-slug="${escapeAttribute(detail.slug)}"
        >
          Envoyer un message
        </button>
      `;
    case 'call':
      if (detail.contactPhoneNumber) {
        return `
          <a
            class="app-flow__button app-flow__button--secondary"
            href="${escapeAttribute(`tel:${detail.contactPhoneNumber}`)}"
          >
            Appeler
          </a>
        `;
      }

      return `
        <button class="app-flow__button app-flow__button--secondary" type="button" disabled>
          Appeler
        </button>
      `;
    default:
      return '';
  }
}

function resolveCategoryLabel(detail) {
  return detail.categoryLabel || categoryLabels[detail.categoryId] || 'Annonce';
}

function renderDetailMedia(detail) {
  const imageUrl = sanitizeListingImageUrl(detail.primaryImageUrl, {
    categoryId: detail.categoryId,
    categoryLabel: detail.categoryLabel,
  });

  if (imageUrl) {
    const imageFallback = buildImageFallbackHandler({
      categoryId: detail.categoryId,
      categoryLabel: detail.categoryLabel,
    });

    return `
      <div class="app-detail__media">
        <img
          class="app-detail__image"
          src="${escapeAttribute(imageUrl)}"
          alt="${escapeAttribute(detail.title)}"
          loading="eager"
          onerror="${escapeAttribute(imageFallback)}"
        />
      </div>
    `;
  }

  return `
    <div class="app-detail__media app-detail__media--placeholder" aria-hidden="true">
      <span>Photo à venir</span>
    </div>
  `;
}

export function renderListingDetailScreen({
  detail = null,
  errorMessage = '',
  state = 'loading',
} = {}) {
  if (state === 'loading') {
    return `
      <section class="app-flow app-flow--detail">
        <header class="app-flow__header">
          <div class="app-flow__meta">
            <a class="app-flow__back" href="#buy">Retour aux annonces</a>
            ${renderInAppBrand({ compact: true })}
          </div>
          <div>
            <p class="app-flow__eyebrow">Acheter</p>
            <h2 class="app-flow__title">Chargement de l'annonce</h2>
          </div>
        </header>
      </section>
    `;
  }

  if (state === 'error' || !detail) {
    return `
      <section class="app-flow app-flow--detail">
        <header class="app-flow__header">
          <div class="app-flow__meta">
            <a class="app-flow__back" href="#buy">Retour aux annonces</a>
            ${renderInAppBrand({ compact: true })}
          </div>
          <div>
            <p class="app-flow__eyebrow">Acheter</p>
            <h2 class="app-flow__title">Annonce indisponible</h2>
          </div>
        </header>

        <div class="app-review__error-summary" data-review-errors>
          <strong>Impossible d'ouvrir cette annonce</strong>
          <ul class="app-review__errors">
            <li>${escapeHtml(errorMessage || 'Annonce introuvable.')}</li>
          </ul>
        </div>
      </section>
    `;
  }

  const categoryLabel = resolveCategoryLabel(detail);

  return `
    <section class="app-flow app-flow--detail">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="#buy">Retour aux annonces</a>
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Acheter</p>
          <h2 class="app-flow__title">${escapeHtml(detail.title)}</h2>
        </div>
      </header>

      <div class="app-publish__summary">
        <strong>${escapeHtml(detail.locationLabel)}</strong>
        <span>${escapeHtml(categoryLabel)}</span>
        <em>${escapeHtml(formatCdf(detail.priceCdf))}</em>
      </div>

      ${renderDetailMedia(detail)}

      <div class="app-auth__card">
        <strong>Description</strong>
        <p>${escapeHtml(detail.summary)}</p>
      </div>

      <div class="app-publish__status is-verified">
        <strong>${escapeHtml(detail.seller.name)}</strong>
        <span>${escapeHtml(detail.seller.role)} · ${escapeHtml(detail.seller.responseTime)}</span>
      </div>

      <section class="app-home__section">
        <div class="app-home__section-head">
          <h3>Conseils de sécurité</h3>
          <span>Rencontre prudente</span>
        </div>
        <div class="app-home__recent-feed">
          ${detail.safetyTips
            .map(
              (tip) => `
                <article class="app-home__listing-card">
                  <div class="app-home__listing-copy">
                    <strong>${escapeHtml(tip)}</strong>
                  </div>
                </article>
              `,
            )
            .join('')}
        </div>
      </section>

      <div class="app-flow__actions" data-contact-actions="${escapeAttribute(detail.contactActions.join(','))}">
        ${['message', 'call']
          .filter((action) => detail.contactActions.includes(action) || (action === 'message' && detail.id))
          .map((action) => buildActionMarkup(action, detail))
          .join('')}
      </div>
    </section>
  `;
}
