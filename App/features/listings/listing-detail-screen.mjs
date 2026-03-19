import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import {
  escapeAttribute,
  escapeHtml,
  formatCdf,
} from '../../utils/rendering.mjs';

function buildBuyerMessage(detail) {
  return `Bonjour, je suis intéressé par ${detail.title} sur Zwibba.`;
}

function buildActionMarkup(action, detail) {
  const message = buildBuyerMessage(detail);

  switch (action) {
    case 'whatsapp':
      return `
        <a
          class="app-flow__button"
          href="${escapeAttribute(`https://wa.me/?text=${encodeURIComponent(message)}`)}"
          rel="noreferrer"
          target="_blank"
        >
          WhatsApp
        </a>
      `;
    case 'sms':
      return `
        <a
          class="app-flow__button app-flow__button--secondary"
          href="${escapeAttribute(`sms:?body=${encodeURIComponent(message)}`)}"
        >
          SMS
        </a>
      `;
    case 'call':
      return `
        <button class="app-flow__button app-flow__button--secondary" type="button" disabled>
          Appeler
        </button>
      `;
    default:
      return '';
  }
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
            <a class="app-flow__back" href="#home">Retour aux annonces</a>
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
            <a class="app-flow__back" href="#home">Retour aux annonces</a>
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

  return `
    <section class="app-flow app-flow--detail">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="#home">Retour aux annonces</a>
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Acheter</p>
          <h2 class="app-flow__title">${escapeHtml(detail.title)}</h2>
        </div>
      </header>

      <div class="app-publish__summary">
        <strong>${escapeHtml(detail.locationLabel)}</strong>
        <span>${escapeHtml(detail.categoryLabel)}</span>
        <em>${escapeHtml(formatCdf(detail.priceCdf))}</em>
      </div>

      <div class="app-auth__card">
        <strong>Résumé</strong>
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
        ${detail.contactActions.map((action) => buildActionMarkup(action, detail)).join('')}
      </div>
    </section>
  `;
}
