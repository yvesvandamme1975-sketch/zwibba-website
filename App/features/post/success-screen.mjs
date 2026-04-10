import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import {
  escapeAttribute,
  escapeHtml,
  formatListingPrice,
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

function resolveDraftPrimaryImage(draft) {
  const primaryPhoto = draft.photos.find((photo) => photo.kind === 'primary') ?? draft.photos[0];

  return primaryPhoto?.publicUrl || primaryPhoto?.url || primaryPhoto?.previewUrl || '';
}

function resolveOutcomeContent(outcome = {}, { listingUrl = '' } = {}) {
  switch (outcome.status) {
    case 'pending_manual_review':
      return {
        eyebrow: 'Annonce envoyée',
        title: 'Annonce en revue manuelle',
        summaryTitle: 'Revue manuelle en cours',
        summaryCopy: outcome.reasonSummary || 'Votre annonce a été transmise à l’équipe Zwibba.',
        showListingLink: false,
        showShareActions: false,
      };
    case 'blocked_needs_fix':
      return {
        eyebrow: 'Annonce envoyée',
        title: 'Annonce bloquée',
        summaryTitle: 'Annonce bloquée',
        summaryCopy:
          outcome.reasonSummary || 'Corrigez les informations du brouillon avant de renvoyer.',
        showListingLink: false,
        showShareActions: false,
      };
    case 'approved':
    default:
      return {
        eyebrow: 'Annonce envoyée',
        title: 'Publication confirmée',
        summaryTitle: 'Annonce publiée',
        summaryCopy:
          'Votre annonce est enregistrée dans le flux vendeur. Vous pouvez maintenant la partager ou revenir à l’accueil.',
        showListingLink: Boolean(listingUrl),
        showShareActions: Boolean(listingUrl),
      };
  }
}

export function renderSuccessScreen({
  boostBusy = false,
  boostMessage = '',
  draft,
  listingRoute = '',
  listingUrl,
  outcome = null,
}) {
  const content = resolveOutcomeContent(outcome ?? {
    status: 'approved',
  }, { listingUrl });
  const primaryImageUrl = resolveDraftPrimaryImage(draft);

  return `
    <section class="app-flow app-flow--success">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="#publish">Retour</a>
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">${escapeHtml(content.eyebrow)}</p>
          <h2 class="app-flow__title">${escapeHtml(content.title)}</h2>
        </div>
      </header>

      <div class="app-publish__status is-verified">
        <strong>${escapeHtml(content.summaryTitle)}</strong>
        <span>${escapeHtml(content.summaryCopy)}</span>
      </div>

      <div class="app-publish__summary">
        <strong>${escapeHtml(draft.details.title || 'Annonce Zwibba')}</strong>
        <span>${escapeHtml(draft.details.area || 'Zone à confirmer')}</span>
        <em>${escapeHtml(formatListingPrice(draft.details))}</em>
      </div>

      ${
        primaryImageUrl
          ? `
            <div class="app-success__hero-media">
              <img
                class="app-success__hero-image"
                src="${escapeAttribute(primaryImageUrl)}"
                alt="${escapeAttribute(draft.details.title || 'Annonce Zwibba')}"
                loading="eager"
              />
            </div>
          `
          : ''
      }

      ${
        content.showListingLink
          ? `
            <div class="app-success__link">
              <span>Lien public de l'annonce</span>
              <strong>${escapeHtml(listingUrl)}</strong>
            </div>
          `
          : ''
      }

      ${
        boostMessage
          ? `
            <div class="app-publish__status is-verified">
              <strong>Boost</strong>
              <span>${escapeHtml(boostMessage)}</span>
            </div>
          `
          : ''
      }

      <div class="app-flow__actions">
        ${
          content.showShareActions
            ? `
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
              <a
                class="app-flow__button app-flow__button--secondary"
                href="${escapeAttribute(listingRoute || '#buy')}"
                data-action="view-listing-link"
                data-listing-route="${escapeAttribute(listingRoute)}"
                data-listing-url="${escapeAttribute(listingUrl)}"
              >
                Voir mon annonce
              </a>
              ${
                outcome?.id
                  ? `
                    <button
                      class="app-flow__button app-flow__button--secondary"
                      type="button"
                      data-action="activate-boost"
                      data-listing-id="${escapeAttribute(outcome.id)}"
                      ${boostBusy ? ' disabled' : ''}
                    >
                      ${boostBusy ? 'Activation...' : 'Booster cette annonce'}
                    </button>
                  `
                  : ''
              }
            `
            : ''
        }
        ${
          outcome?.status === 'blocked_needs_fix'
            ? '<a class="app-flow__button app-flow__button--secondary" href="#review">Modifier le brouillon</a>'
            : ''
        }
        <a class="app-flow__button app-flow__button--secondary" href="#home">Retour à l'accueil</a>
      </div>
    </section>
  `;
}
