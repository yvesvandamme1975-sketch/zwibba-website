import {
  MAX_PRICE_CDF,
  getMissingRequiredPhotoPrompts,
  isConditionRequired,
} from './post-flow-controller.mjs';
import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import {
  escapeAttribute,
  escapeHtml,
} from '../../utils/rendering.mjs';
import {
  formatPricePreview,
  getPriceInputPlaceholder,
  normalizePriceCurrency,
} from '../../utils/price-input.mjs';
import {
  getFashionAttributes,
  getFashionItemTypeOptions,
  getFashionSizeOptions,
  isFashionCategory,
} from '../../utils/fashion-attributes.mjs';

function renderError(error) {
  return `<li data-review-error-field="${escapeAttribute(error.field)}">${escapeHtml(error.message)}</li>`;
}

function renderOption(option, currentValue) {
  const value = option.value ?? option.id;
  const label = option.label;
  const selected = value === currentValue ? ' selected' : '';

  return `<option value="${escapeAttribute(value)}"${selected}>${escapeHtml(label)}</option>`;
}

function renderPhoto(photo) {
  const photoStatus =
    photo.uploadStatus === 'uploading'
      ? 'Téléversement en cours'
      : photo.uploadStatus === 'failed'
        ? 'Téléversement à relancer'
        : photo.publicUrl || photo.previewUrl || photo.url
          ? 'Aperçu prêt pour la publication'
          : 'Aperçu indisponible';

  return `
    <div class="app-review__photo${photo.kind !== 'primary' ? ' is-guided' : ''}">
      <strong>${escapeHtml(photo.promptId || 'Photo principale')}</strong>
      <span>${escapeHtml(photoStatus)}</span>
    </div>
  `;
}

function resolveDraftPrimaryImage(draft) {
  const primaryPhoto = draft.photos.find((photo) => photo.kind === 'primary') ?? draft.photos[0];

  return primaryPhoto?.publicUrl || primaryPhoto?.url || primaryPhoto?.previewUrl || '';
}

function hasFieldError(validationErrors, field) {
  return validationErrors.some((error) => error.field === field);
}

function renderFieldClass({
  isFull = false,
  validationErrors,
  field,
}) {
  const classes = ['app-review__field'];

  if (isFull) {
    classes.push('app-review__field--full');
  }

  if (hasFieldError(validationErrors, field)) {
    classes.push('app-review__field--invalid');
  }

  return classes.join(' ');
}

function renderValidationSummary(validationErrors) {
  if (!validationErrors.length) {
    return '';
  }

  return `
    <div class="app-review__error-summary" data-review-errors>
      <strong>Complétez ces champs avant de publier</strong>
      <ul class="app-review__errors">
        ${validationErrors.map(renderError).join('')}
      </ul>
    </div>
  `;
}

export function renderReviewFormScreen({
  categories,
  conditionOptions,
  draft,
  profileArea = '',
  validationErrors = [],
}) {
  const missingPrompts = getMissingRequiredPhotoPrompts(draft);
  const primaryImageUrl = resolveDraftPrimaryImage(draft);
  const isManualFallback = draft.ai.status === 'manual_fallback';
  const summaryTitle = isManualFallback ? 'Préparation manuelle' : 'Détails préparés';
  const summaryClass = isManualFallback
    ? 'app-review__summary app-review__summary--manual'
    : 'app-review__summary';
  const summaryMessage = draft.ai.message || "L'IA prépare les bases du brouillon.";
  const resolvedProfileArea = String(profileArea || draft.details.area || '').trim();
  const priceCurrency = normalizePriceCurrency(draft.details.priceCurrency);
  const currencyOptions = [
    { value: 'CDF', label: 'CDF' },
    { value: 'USD', label: 'US$' },
  ];
  const priceInputValue =
    draft.details.priceAmount === null || draft.details.priceAmount === undefined
      ? ''
      : String(draft.details.priceAmount);
  const pricePreview = formatPricePreview(priceInputValue, priceCurrency);
  const pricePlaceholder = getPriceInputPlaceholder(priceCurrency);
  const isPriceDisabled = !priceCurrency;
  const isFashion = isFashionCategory(draft.details.categoryId);
  const fashionAttributes = getFashionAttributes(draft.details.attributesJson);
  const fashionItemTypeOptions = getFashionItemTypeOptions();
  const fashionSizeOptions = getFashionSizeOptions(fashionAttributes.itemType);
  const isFashionSizeDisabled = !fashionAttributes.itemType;

  return `
    <section class="app-flow app-flow--review">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="#guidance">Retour</a>
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Étape 3</p>
          <h2 class="app-flow__title">Corrigez le brouillon</h2>
        </div>
      </header>

      <div class="app-review__top">
        <div class="${summaryClass}">
          <strong>${escapeHtml(summaryTitle)}</strong>
          <span>${escapeHtml(summaryMessage)}</span>
        </div>
      </div>

      ${
        primaryImageUrl
          ? `
            <div class="app-review__hero-media">
              <img
                class="app-review__hero-image"
                src="${escapeAttribute(primaryImageUrl)}"
                alt="${escapeAttribute(draft.details.title || 'Aperçu du brouillon')}"
                loading="eager"
              />
            </div>
          `
          : `
            <div class="app-review__hero-media app-review__hero-media--fallback">
              <strong>Aperçu indisponible</strong>
              <span>Ajoutez ou relancez votre photo principale avant de publier.</span>
            </div>
          `
      }

      <div class="app-review__photos">
        ${draft.photos.map(renderPhoto).join('')}
      </div>

      ${
        missingPrompts.length
          ? `
            <div class="app-review__missing">
              <strong>Photos guidées encore attendues</strong>
              <span>${escapeHtml(missingPrompts.map((prompt) => prompt.label).join(', '))}</span>
            </div>
          `
          : ''
      }

      <form class="app-review__form" data-form="review-draft">
        <div class="app-review__grid">
          <label class="${renderFieldClass({ validationErrors, field: 'title' })}">
            <span>Titre</span>
            <input name="title" type="text" value="${escapeAttribute(draft.details.title)}" />
          </label>

          <label class="${renderFieldClass({ validationErrors, field: 'category' })}">
            <span>Catégorie</span>
            <select name="categoryId">
              <option value="">Choisir</option>
              ${categories.map((category) => renderOption(category, draft.details.categoryId)).join('')}
            </select>
          </label>

          <label class="${renderFieldClass({ validationErrors, field: 'condition' })}">
            <span>État ${isConditionRequired(draft) ? '' : '(facultatif)'}</span>
            <select name="condition">
              <option value="">Choisir</option>
              ${conditionOptions.map((option) => renderOption(option, draft.details.condition)).join('')}
            </select>
          </label>

          ${
            isFashion
              ? `
                <label class="${renderFieldClass({ validationErrors, field: 'fashion_item_type' })}">
                  <span>Type d’article</span>
                  <select name="fashionItemType">
                    <option value="">Choisir</option>
                    ${fashionItemTypeOptions
                      .map((option) => renderOption(option, fashionAttributes.itemType))
                      .join('')}
                  </select>
                </label>

                <label class="${renderFieldClass({ validationErrors, field: 'fashion_size' })}">
                  <span>Taille</span>
                  <select name="fashionSize" ${isFashionSizeDisabled ? 'disabled' : ''}>
                    <option value="">Choisir</option>
                    ${fashionSizeOptions
                      .map((option) => renderOption(option, fashionAttributes.size))
                      .join('')}
                  </select>
                </label>
              `
              : ''
          }

          <label class="${renderFieldClass({ validationErrors, field: 'price' })}">
            <span>Devise</span>
            <select name="priceCurrency">
              <option value="">Choisir</option>
              ${currencyOptions.map((option) => renderOption(option, priceCurrency)).join('')}
            </select>
          </label>

          <label class="${renderFieldClass({ validationErrors, field: 'price' })}">
            <span>Prix final</span>
            <input
              name="priceAmount"
              type="text"
              inputmode="numeric"
              min="0"
              step="1000"
              value="${escapeAttribute(priceInputValue)}"
              max="${escapeAttribute(MAX_PRICE_CDF)}"
              placeholder="${escapeAttribute(pricePlaceholder)}"
              autocomplete="off"
              ${isPriceDisabled ? 'disabled' : ''}
            />
            <small class="app-review__field-hint" data-price-preview>${escapeHtml(pricePreview)}</small>
          </label>

          <label class="${renderFieldClass({ isFull: true, validationErrors, field: 'description' })}">
            <span>Description</span>
            <textarea name="description" rows="4">${escapeHtml(draft.details.description)}</textarea>
          </label>

          <div class="${renderFieldClass({ isFull: true, validationErrors, field: 'area' })}">
            <span>Zone</span>
            ${
              resolvedProfileArea
                ? `
                  <div class="app-review__readonly-value">
                    <strong>${escapeHtml(resolvedProfileArea)}</strong>
                    <a class="app-flow__link" href="#profile">Modifier dans le profil</a>
                  </div>
                `
                : `
                  <div class="app-review__missing-profile-area">
                    <strong>Définissez votre zone dans le profil avant de publier.</strong>
                    <a class="app-flow__link" href="#profile">Ouvrir le profil</a>
                  </div>
                `
            }
          </div>
        </div>

        ${renderValidationSummary(validationErrors)}

        <div class="app-flow__actions">
          <button class="app-flow__button" type="submit">Publier l'annonce</button>
        </div>
      </form>
    </section>
  `;
}
