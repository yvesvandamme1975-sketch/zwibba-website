import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import {
  escapeAttribute,
  escapeHtml,
  formatCdf,
} from '../../utils/rendering.mjs';

function buildWhatsAppShareUrl({ draft, listingUrl }) {
  const title = draft.details.title || 'Mon annonce Zwibba';
  const absoluteUrl =
    typeof window === 'undefined'
      ? listingUrl
      : new URL(listingUrl, window.location.origin).toString();
  const text = `${title} est maintenant en ligne sur Zwibba: ${absoluteUrl}`;

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function renderSuccessScreen({ draft, listingUrl }) {
  return `
    <section class="app-flow app-flow--success">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="#publish">Retour</a>
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Annonce envoyée</p>
          <h2 class="app-flow__title">Publication confirmée</h2>
        </div>
      </header>

      <div class="app-publish__status is-verified">
        <strong>Annonce publiée</strong>
        <span>
          Votre annonce est enregistrée dans le flux vendeur. Vous pouvez maintenant la partager
          ou revenir à l'accueil.
        </span>
      </div>

      <div class="app-publish__summary">
        <strong>${escapeHtml(draft.details.title || 'Annonce Zwibba')}</strong>
        <span>${escapeHtml(draft.details.area || 'Zone à confirmer')}</span>
        <em>${escapeHtml(formatCdf(draft.details.priceCdf))}</em>
      </div>

      <div class="app-success__link">
        <span>Lien public simulé</span>
        <strong>${escapeHtml(listingUrl)}</strong>
      </div>

      <div class="app-flow__actions">
        <a
          class="app-flow__button"
          href="${escapeAttribute(buildWhatsAppShareUrl({ draft, listingUrl }))}"
          rel="noreferrer"
          target="_blank"
        >
          Partager sur WhatsApp
        </a>
        <button
          class="app-flow__button app-flow__button--secondary"
          type="button"
          data-action="copy-listing-link"
          data-listing-url="${escapeAttribute(listingUrl)}"
        >
          Copier le lien
        </button>
        <button
          class="app-flow__button app-flow__button--secondary"
          type="button"
          data-action="view-listing-link"
          data-listing-url="${escapeAttribute(listingUrl)}"
        >
          Voir mon annonce
        </button>
        <a class="app-flow__button app-flow__button--secondary" href="#home">Retour à l'accueil</a>
      </div>
    </section>
  `;
}
