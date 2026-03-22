import {
  getMissingRequiredPhotoPrompts,
  isConditionRequired,
} from './post-flow-controller.mjs';
import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import {
  escapeAttribute,
  escapeHtml,
  formatCdf,
} from '../../utils/rendering.mjs';

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
  return `
    <div class="app-review__photo${photo.kind !== 'primary' ? ' is-guided' : ''}">
      <strong>${escapeHtml(photo.promptId || 'Photo principale')}</strong>
      <span>${escapeHtml(photo.url || photo.previewUrl || 'Photo locale')}</span>
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
  areaOptions,
  categories,
  conditionOptions,
  draft,
  validationErrors = [],
}) {
  const missingPrompts = getMissingRequiredPhotoPrompts(draft);
  const priceRange =
    draft.details.suggestedPriceMinCdf && draft.details.suggestedPriceMaxCdf
      ? `${formatCdf(draft.details.suggestedPriceMinCdf)} - ${formatCdf(
          draft.details.suggestedPriceMaxCdf,
        )}`
      : 'Ajoutez votre prix librement';
  const primaryImageUrl = resolveDraftPrimaryImage(draft);

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
        <div class="app-review__summary">
          <strong>Pré-remplissage IA</strong>
          <span>${escapeHtml(draft.ai.message || "L'IA prépare les bases du brouillon.")}</span>
        </div>
        <div class="app-review__price-range">
          <span>Fourchette IA</span>
          <strong>${escapeHtml(priceRange)}</strong>
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
          : ''
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

          <label class="${renderFieldClass({ validationErrors, field: 'price' })}">
            <span>Prix final (CDF)</span>
            <input name="priceCdf" type="number" min="0" step="1000" value="${escapeAttribute(
              draft.details.priceCdf ?? '',
            )}" />
          </label>

          <label class="${renderFieldClass({ isFull: true, validationErrors, field: 'description' })}">
            <span>Description</span>
            <textarea name="description" rows="4">${escapeHtml(draft.details.description)}</textarea>
          </label>

          <label class="${renderFieldClass({ isFull: true, validationErrors, field: 'area' })}">
            <span>Zone</span>
            <select name="area">
              <option value="">Choisir une zone</option>
              ${areaOptions.map((option) => renderOption({ value: option, label: option }, draft.details.area)).join('')}
            </select>
          </label>
        </div>

        ${renderValidationSummary(validationErrors)}

        <div class="app-flow__actions">
          <button class="app-flow__button" type="submit">Publier l'annonce</button>
        </div>
      </form>
    </section>
  `;
}
