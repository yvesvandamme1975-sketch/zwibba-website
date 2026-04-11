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

const categoryLabels = {
  agriculture: 'Agriculture',
  construction: 'Construction',
  education: 'École / Université',
  emploi: 'Emplois',
  electronics: 'Électronique',
  fashion: 'Mode',
  food: 'Alimentation',
  home_garden: 'Maison',
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
  tone = 'primary',
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

function renderOwnerLifecycleCard(detail) {
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

  if (detail.canDelete) {
    actions.push(
      buildLifecycleActionButton({
        action: 'delete',
        detail,
        label: 'Supprimer l’annonce',
        tone: 'secondary',
      }),
    );
  }

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
      ${
        actions.length
          ? `<div class="app-flow__actions app-flow__actions--stacked">${actions.join('')}</div>`
          : ''
      }
    </div>
  `;
}

function resolveCategoryLabel(detail) {
  return detail.categoryLabel || categoryLabels[detail.categoryId] || 'Annonce';
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
        </div>
        ${
          images.length > 1
            ? `
              <div class="app-detail__thumbstrip" role="list" aria-label="Autres photos">
                ${images
                  .map(
                    (thumbnailUrl, index) => `
                      <button
                        class="app-detail__thumbnail${index === activeIndex ? ' is-active' : ''}"
                        type="button"
                        role="listitem"
                        aria-pressed="${index === activeIndex ? 'true' : 'false'}"
                        data-action="select-listing-image"
                        data-image-index="${escapeAttribute(String(index))}"
                      >
                        <img
                          class="app-detail__thumbnail-image"
                          src="${escapeAttribute(thumbnailUrl)}"
                          alt="${escapeAttribute(`${detail.title} photo ${index + 1}`)}"
                          loading="lazy"
                          onerror="${escapeAttribute(imageFallback)}"
                        />
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
        <span class="app-detail__safety-icon" aria-hidden="true">!</span>
        <div class="app-detail__safety-copy">
          <strong>Conseils de sécurité</strong>
          <span>Attention</span>
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

export function renderListingDetailScreen({
  detail = null,
  errorMessage = '',
  selectedImageIndex = 0,
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
        <em>${escapeHtml(formatListingPrice(detail))}</em>
      </div>

      ${renderDetailMedia(detail, selectedImageIndex)}

      <div class="app-auth__card">
        <strong>Description</strong>
        <p>${escapeHtml(detail.summary)}</p>
      </div>

      <div class="app-publish__status is-verified">
        <strong>${escapeHtml(detail.seller.name)}</strong>
        <span>${escapeHtml(detail.seller.role)} · ${escapeHtml(detail.seller.responseTime)}</span>
      </div>

      ${renderSafetyCard(detail)}

      ${
        detail.viewerRole === 'owner'
          ? renderOwnerLifecycleCard(detail)
          : `
            <div class="app-flow__actions" data-contact-actions="${escapeAttribute(detail.contactActions.join(','))}">
              ${['message', 'call']
                .filter((action) =>
                  action === 'message'
                    ? Boolean(detail.id)
                    : detail.contactActions.includes(action),
                )
                .map((action) => buildActionMarkup(action, detail))
                .join('')}
            </div>
          `
      }
    </section>
  `;
}
