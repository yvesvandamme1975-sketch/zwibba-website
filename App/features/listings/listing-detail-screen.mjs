import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import {
  escapeAttribute,
  escapeHtml,
  formatListingPrice,
} from '../../utils/rendering.mjs';
import {
  buildImageFallbackHandler,
  sanitizeListingImageUrl,
} from '../../utils/image-fallbacks.mjs';
import { sellerMonogram } from '../../utils/seller-monogram.mjs';
import { renderRatingStars } from '../../utils/rating-stars.mjs';
import {
  getFashionAttributes,
  getFashionItemTypeLabel,
} from '../../utils/fashion-attributes.mjs';
import { buildWhatsAppChatLink } from '../../utils/whatsapp-link.mjs';

const categoryLabels = {
  agriculture: 'Agriculture',
  beauty: 'Beauté',
  construction: 'Bricolage / Construction',
  education: 'École / Université',
  emploi: 'Emplois',
  electronics: 'Électronique',
  fashion: 'Mode',
  food: 'Alimentation',
  health: 'Santé',
  home_garden: 'Maison',
  music: 'Musique',
  phones_tablets: 'Téléphones & Tablettes',
  real_estate: 'Immobilier',
  services: 'Services',
  sports_leisure: 'Sports et loisirs',
  vehicles: 'Véhicules',
};

function clampSelectedImageIndex(index, images) {
  const parsedIndex = Number(index);

  if (!Number.isInteger(parsedIndex) || parsedIndex < 0) {
    return 0;
  }

  return Math.min(parsedIndex, Math.max(images.length - 1, 0));
}

function buildBuyerMessage(detail) {
  return `Bonjour, je suis intéressé par ${detail.title} sur Zwibba.`;
}

function buildLifecycleActionButton({
  action,
  detail,
  label,
  tone = 'secondary',
} = {}) {
  const className =
    tone === 'secondary'
      ? 'app-flow__button app-flow__button--secondary'
      : 'app-flow__button';

  return `
    <button
      class="${className}"
      type="button"
      data-action="listing-lifecycle"
      data-lifecycle-action="${escapeAttribute(action)}"
      data-listing-id="${escapeAttribute(detail.id)}"
      data-listing-slug="${escapeAttribute(detail.slug)}"
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function buildEditListingButton(detail) {
  return `
    <button
      class="app-flow__button"
      type="button"
      data-action="edit-listing"
      data-listing-slug="${escapeAttribute(detail.slug)}"
    >
      Modifier
    </button>
  `;
}

function buildShareButton(detail, { compact = false, story = false } = {}) {
  if (!detail.slug) {
    return '';
  }

  const shareUrl = `/annonce/${detail.slug}/`;
  const className = compact
    ? 'app-flow__button app-flow__button--secondary app-detail__share'
    : 'app-flow__button app-flow__button--share';

  // Keep the explicit story export separate from native link sharing.
  if (story) return resolveGalleryImages(detail).length ? `
    <button
      class="app-flow__button app-flow__button--secondary app-detail__story"
      type="button"
      data-action="open-share-menu"
      data-share-mode="story"
      data-share-context="story"
      data-share-slug="${escapeAttribute(detail.slug)}"
      data-share-title="${escapeAttribute(detail.title)}"
      data-share-url="${escapeAttribute(shareUrl)}"
    >
      Story Instagram
    </button>
  ` : '';

  return `
    <button
      class="${escapeAttribute(className)}"
      type="button"
      data-action="open-share-menu"
      data-share-slug="${escapeAttribute(detail.slug)}"
      data-share-title="${escapeAttribute(detail.title)}"
      data-share-image-url="${escapeAttribute(resolveGalleryImages(detail)[0] || '')}"
      data-share-url="${escapeAttribute(shareUrl)}"
      ${detail.shareImageUrl ? `data-branded-image-url="${escapeAttribute(detail.shareImageUrl)}"` : ''}
      ${detail.storyImageUrl ? `data-story-image-url="${escapeAttribute(detail.storyImageUrl)}"` : ''}
      ${compact ? `aria-label="${escapeAttribute('Partager cette annonce')}"` : ''}
    >
      ${compact ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7"/></svg>' : ''} Partager
    </button>
  `;
}

const contactIcons = {
  message: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
  whatsapp: '<path d="m3 21 1.6-5A9 9 0 1 1 8 20Z"/><path d="M8 7c0 5 4 9 9 9l1-3-3-1-1 1-3-3 1-1-1-3Z"/>',
  call: '<path d="M8 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-4l-5-2-2 2a14 14 0 0 1-6-6l2-2Z"/>',
};

function buildActionMarkup(action, detail, contactBusy = false) {
  const icon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${contactIcons[action] || ''}</svg>`;
  switch (action) {
    case 'message':
      return `
        <button
          class="app-flow__button"
          type="button"
          data-action="start-thread" ${contactBusy ? 'disabled aria-busy="true"' : ''}
          data-listing-id="${escapeAttribute(detail.id)}"
          data-listing-slug="${escapeAttribute(detail.slug)}"
        >
          ${icon}<span>${contactBusy ? 'Ouverture…' : 'Envoyer un message'}</span>
        </button>
      `;
    case 'whatsapp': {
      const chatLink = buildWhatsAppChatLink(
        detail.contactPhoneNumber,
        `Bonjour, votre annonce « ${detail.title} » sur Zwibba m'intéresse.`,
      );

      if (!chatLink) {
        return '';
      }

      return `
        <a
          class="app-flow__button app-flow__button--secondary"
          href="${escapeAttribute(chatLink)}"
          target="_blank"
          rel="noreferrer"
        >
          ${icon}<span>WhatsApp</span>
        </a>
      `;
    }
    case 'call':
      if (detail.contactPhoneNumber) {
        return `
          <a
            class="app-flow__button app-flow__button--secondary"
            href="${escapeAttribute(`tel:${detail.contactPhoneNumber}`)}"
          >
            ${icon}<span>Appeler</span>
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

export function renderListingOwnerActions({ detail = null, busy = false, message = '' } = {}) {
  if (detail?.viewerRole !== 'owner') return '';

  const actions = [];

  if (detail.editDraft) {
    actions.push(buildEditListingButton(detail));
  }

  if (detail.canPause) {
    actions.push(
      buildLifecycleActionButton({
        action: 'pause',
        detail,
        label: 'Mettre en pause',
      }),
    );
  }

  if (detail.canResume) {
    actions.push(
      buildLifecycleActionButton({
        action: 'resume',
        detail,
        label: 'Remettre en ligne',
      }),
    );
  }

  if (detail.canMarkSold) {
    actions.push(
      buildLifecycleActionButton({
        action: 'mark_sold',
        detail,
        label: 'Marquer comme vendue',
      }),
    );
  }

  if (detail.canRelist) {
    actions.push(
      buildLifecycleActionButton({
        action: 'relist',
        detail,
        label: 'Remettre en vente',
      }),
    );
  }

  if (detail.canRestore) {
    actions.push(
      buildLifecycleActionButton({
        action: 'restore',
        detail,
        label: 'Restaurer',
      }),
    );
  }

  if (!actions.length && !message) return '';
  return `
    <div class="app-detail__contact-dock app-detail__owner-dock" aria-label="Actions de mon annonce">
      ${message ? `<p class="app-detail__owner-feedback" role="status">${escapeHtml(message)}</p>` : ''}
      <fieldset class="app-flow__actions" ${busy ? 'disabled aria-busy="true"' : ''}>
        <legend class="sr-only">Gérer mon annonce</legend>
        ${actions.join('')}
      </fieldset>
    </div>
  `;
}

function renderOwnerLifecycleCard(detail, { showActions, busy } = {}) {
  return `
    <div class="app-auth__card app-detail__owner-card">
      <strong>Gérer mon annonce</strong>
      <p>Statut actuel: ${escapeHtml(detail.lifecycleStatusLabel || 'Active')}</p>
      ${
        detail.soldChannel
          ? `<span class="app-detail__owner-meta">${escapeHtml(detail.soldChannel)}</span>`
          : ''
      }
      ${
        detail.deletedReason
          ? `<span class="app-detail__owner-meta">${escapeHtml(detail.deletedReason)}</span>`
          : ''
      }
      ${
        detail.restoreUntil
          ? `<span class="app-detail__owner-meta">Restaurable jusqu’au ${escapeHtml(new Date(detail.restoreUntil).toLocaleDateString('fr-FR'))}</span>`
          : ''
      }
      ${detail.canDelete ? `
        <fieldset class="app-detail__owner-delete" ${busy ? 'disabled aria-busy="true"' : ''}>
          <legend class="sr-only">Retirer mon annonce</legend>
          ${buildLifecycleActionButton({ action: 'delete', detail, label: 'Supprimer l’annonce', tone: 'secondary' })}
        </fieldset>` : ''}
      ${showActions ? renderListingOwnerActions({ detail, busy }) : ''}
    </div>
  `;
}

function resolveCategoryLabel(detail) {
  return detail.categoryLabel || categoryLabels[detail.categoryId] || 'Annonce';
}

function renderAttributeDetails(detail) {
  const fashion = detail.categoryId === 'fashion' ? getFashionAttributes(detail.attributesJson) : {};
  const rows = [
    ['Catégorie', resolveCategoryLabel(detail)],
    ['Localisation', detail.locationLabel],
    ["Type d'article", getFashionItemTypeLabel(fashion.itemType)],
    ['Taille', fashion.size],
  ].filter(([, value]) => value);
  return `<section class="app-detail__section"><h3>Détails</h3><dl class="app-detail__attributes">${rows.map(([label, value]) =>
    `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl></section>`;
}

function resolveGalleryImages(detail) {
  const rawImages = Array.isArray(detail.images) && detail.images.length
    ? detail.images
    : detail.primaryImageUrl
      ? [detail.primaryImageUrl]
      : [];

  return rawImages
    .map((imageUrl) =>
      sanitizeListingImageUrl(imageUrl, {
        categoryId: detail.categoryId,
        categoryLabel: detail.categoryLabel,
      }),
    )
    .filter(Boolean);
}

function renderDetailMedia(detail, selectedImageIndex = 0) {
  const images = resolveGalleryImages(detail);
  const activeIndex = clampSelectedImageIndex(selectedImageIndex, images);
  const imageUrl = images[activeIndex];

  if (imageUrl) {
    const imageFallback = buildImageFallbackHandler({
      categoryId: detail.categoryId,
      categoryLabel: detail.categoryLabel,
    });

    return `
      <div class="app-detail__gallery">
        <div class="app-detail__media">
          <img
            class="app-detail__image"
            src="${escapeAttribute(imageUrl)}"
            alt="${escapeAttribute(detail.title)}"
            loading="eager"
            onerror="${escapeAttribute(imageFallback)}"
          />
          <span class="app-detail__photo-count" aria-live="polite">${escapeHtml(`${activeIndex + 1} / ${images.length}`)}</span>
        </div>
        ${
          images.length > 1
            ? `
              <div class="app-detail__thumbstrip" role="group" aria-label="Autres photos">
                ${images
                  .map(
                    (_, index) => `
                      <button
                        class="app-detail__thumbnail${index === activeIndex ? ' is-active' : ''}"
                        type="button"
                        aria-label="${escapeAttribute(`Voir la photo ${index + 1}`)}"
                        aria-pressed="${index === activeIndex ? 'true' : 'false'}"
                        data-action="select-listing-image"
                        data-image-index="${escapeAttribute(String(index))}"
                      >
                      </button>
                    `,
                  )
                  .join('')}
              </div>
            `
            : ''
        }
      </div>
    `;
  }

  return `
    <div class="app-detail__media app-detail__media--placeholder" aria-hidden="true">
      <span>Photo à venir</span>
    </div>
  `;
}

function renderSafetyCard(detail) {
  if (!Array.isArray(detail.safetyTips) || detail.safetyTips.length === 0) {
    return '';
  }

  return `
    <section class="app-detail__safety-card" aria-label="Conseils de sécurité">
      <div class="app-detail__safety-head">
        <svg class="app-detail__safety-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 11 3 3 5-5"/></svg>
        <div class="app-detail__safety-copy">
          <strong>Conseils de sécurité</strong>
        </div>
      </div>
      <ul class="app-detail__safety-list">
        ${detail.safetyTips
          .map(
            (tip) => `
              <li>${escapeHtml(tip)}</li>
            `,
          )
          .join('')}
      </ul>
    </section>
  `;
}

function renderSellerBlock(seller = {}, { compact = false } = {}) {
  const sellerName = seller.name || 'Vendeur Zwibba';
  const sellerRole = seller.role || 'Vendeur';
  const memberDate = seller.memberSince && new Date(seller.memberSince);
  const memberSince = memberDate && Number.isFinite(memberDate.getTime()) ? memberDate.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) : '';
  const sellerId = String(seller.sellerId || '').trim();
  const sellerContent = `
    <span class="app-detail__avatar" aria-hidden="true">${escapeHtml(sellerMonogram(sellerName))}</span>
    <span class="app-detail__seller-copy">
    <strong>${escapeHtml(sellerName)}</strong>
    ${!compact && sellerRole !== 'Vendeur' ? `<span>${escapeHtml(sellerRole)}</span>` : ''}
    ${!compact && memberSince ? `<span>Membre depuis ${escapeHtml(memberSince)}</span>` : ''}
    ${renderRatingStars({
      average: seller.ratingAverage,
      count: seller.ratingCount,
    })}
    </span>
    ${sellerId ? '<span class="app-detail__seller-chevron" aria-hidden="true">›</span>' : ''}
  `;

  if (!sellerId) {
    return `
      <div class="app-detail__seller">
        ${sellerContent}
      </div>
    `;
  }

  return `
    <a class="app-detail__seller app-detail__seller-link" href="#seller/${escapeAttribute(sellerId)}">
      ${sellerContent}
    </a>
  `;
}

function renderReviewForm(detail, review = {}) {
  if (detail.viewerRole === 'owner') {
    return '';
  }

  if (review.status === 'saved') return '<p class="app-auth__card app-detail__review-message" role="status" data-review-message tabindex="-1">Votre avis a bien été enregistré.</p>';

  if (!detail.canReview) return '<p class="app-auth__card">Envoyez un message dans Zwibba avant de laisser un avis.</p>';

  return `
    <form class="app-auth__card app-detail__review-form" data-action="submit-review">
      <input type="hidden" name="slug" value="${escapeAttribute(detail.slug)}" />
      <strong>Votre avis</strong>
      <fieldset class="app-detail__rating-input"${review.status === 'sending' ? ' disabled' : ''}>
        <legend>Votre note</legend>
        ${[1,2,3,4,5].map(rating => `<label><input type="radio" name="rating" value="${escapeAttribute(rating)}"${review.rating === rating ? ' checked' : ''} required aria-label="${escapeAttribute(`${rating} étoile${rating > 1 ? 's' : ''}`)}" /><span aria-hidden="true">★</span></label>`).join('')}
      </fieldset>
      <label class="app-detail__review-field">
        <span>Commentaire</span>
        <textarea name="comment" rows="3" maxlength="280" placeholder="Optionnel"${review.status === 'sending' ? ' disabled' : ''}>${escapeHtml(review.comment ?? '')}</textarea>
      </label>
      <button class="app-flow__button" type="submit"${review.status === 'sending' ? ' disabled' : ''}>Envoyer l’avis</button>
      <p class="app-detail__review-message" role="${review.status === 'error' ? 'alert' : 'status'}" data-review-message tabindex="-1">${escapeHtml(review.message ?? '')}</p>
    </form>
  `;
}

export function renderListingContactActions({ detail, contactBusy = false, contactError = '' } = {}) {
  if (!detail || detail.viewerRole === 'owner') return '';
  const actions = ['message', 'whatsapp', 'call'].filter(action =>
    action === 'message' ? Boolean(detail.id) : (detail.contactActions || []).includes(action));
  if (!actions.length) return '';
  return `<div class="app-detail__contact-dock">
    ${contactError ? `<p class="app-flow__error" role="alert">${escapeHtml(contactError)}</p><a href="#messages">Mes messages</a>` : ''}
    <div class="app-flow__actions" role="group" aria-label="Contacter le vendeur" data-contact-actions="${escapeAttribute((detail.contactActions || []).join(','))}">
      ${actions.map(action => buildActionMarkup(action, detail, contactBusy)).join('')}
    </div>
  </div>`;
}

export function renderListingDetailScreen({
  detail = null,
  errorMessage = '',
  contactBusy = false,
  contactError = '',
  showContactActions = true,
  showOwnerActions = true,
  ownerBusy = false,
  selectedImageIndex = 0,
  review = {},
  state = 'loading',
} = {}) {
  if (state === 'loading') {
    return `
      <section class="app-flow app-flow--detail">
        <header class="app-flow__header">
          <div class="app-flow__meta">
            ${renderInAppBrand({ compact: true })}
            <a class="app-flow__back" href="#buy">Retour aux annonces</a>
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
            ${renderInAppBrand({ compact: true })}
            <a class="app-flow__back" href="#buy">Retour aux annonces</a>
          </div>
          <div>
            <p class="app-flow__eyebrow">Acheter</p>
            <h2 class="app-flow__title">Annonce indisponible</h2>
          </div>
        </header>

        ${review.status === 'saved' ? '<p class="app-detail__review-message" role="status" data-review-message tabindex="-1">Votre avis a bien été enregistré.</p>' : ''}
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
        ${renderInAppBrand({ compact: true, countryCode: detail.countryCode })}
        <div class="app-detail__toolbar">
          <a class="app-flow__back" href="${detail.viewerRole === 'owner' ? '#profile' : '#buy'}" aria-label="${detail.viewerRole === 'owner' ? 'Retour à mes annonces' : 'Retour aux annonces'}">${detail.viewerRole === 'owner' ? 'Mes annonces' : 'Retour'}</a>
          ${buildShareButton(detail, { compact: true })}
          ${buildShareButton(detail, { story: true })}
        </div>
      </header>

      <div class="app-detail__layout">
        ${renderDetailMedia(detail, selectedImageIndex)}
        <div class="app-detail__overview">
          <div class="app-detail__heading">
            <h2 class="app-flow__title">${escapeHtml(detail.title)}</h2>
            <p class="app-detail__price">${escapeHtml(formatListingPrice(detail))}</p>
            <p class="app-detail__location"><span>${escapeHtml(detail.locationLabel)}</span> · <span>${escapeHtml(categoryLabel)}</span></p>
          </div>
          ${detail.summary ? `<p class="app-detail__summary">${escapeHtml(detail.summary)}</p>` : ''}
          ${renderSellerBlock(detail.seller, { compact: true })}
          ${detail.viewerRole === 'owner' ? renderOwnerLifecycleCard(detail, { showActions: showOwnerActions, busy: ownerBusy }) :
            showContactActions ? renderListingContactActions({ detail, contactBusy, contactError }) : ''}
          ${detail.publishedAt && Number.isFinite(Date.parse(detail.publishedAt)) ? `<p class="app-detail__date">Annonce publiée le ${escapeHtml(new Date(detail.publishedAt).toLocaleDateString('fr-FR'))}</p>` : ''}
        </div>
      </div>

      <div class="app-detail__information">
        <section class="app-detail__section">
          <h3>Description</h3>
          <p>${escapeHtml(detail.summary)}</p>
        </section>
        ${renderAttributeDetails(detail)}
        ${renderSellerBlock(detail.seller)}
        ${renderSafetyCard(detail)}
        ${renderReviewForm(detail, review)}
      </div>
    </section>
  `;
}
