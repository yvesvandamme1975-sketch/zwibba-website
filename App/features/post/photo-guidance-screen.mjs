import {
  getGuidedPhotoPrompts,
  getMissingRequiredPhotoPrompts,
} from './post-flow-controller.mjs';
import { sellerCategories } from '../../demo-content.mjs';
import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { renderUploadProgress } from '../../components/upload-progress.mjs';
import { escapeAttribute, escapeHtml } from '../../utils/rendering.mjs';

const categoryLabels = new Map(
  sellerCategories.map((category) => [category.id, category.label]),
);

function formatCategoryLabel(categoryId) {
  return categoryLabels.get(categoryId) ?? categoryId ?? 'à confirmer';
}

function renderPrompt(prompt) {
  const actionLabel =
    prompt.uploadStatus === 'failed'
      ? 'Réessayer'
      : prompt.completed
        ? 'Remplacer'
        : 'Ajouter cette photo';
  const statusCopy =
    prompt.uploadStatus === 'failed'
      ? prompt.uploadError || 'Le téléversement a échoué.'
      : prompt.uploadStatus === 'uploading'
        ? 'Téléversement en cours'
        : prompt.completed
          ? 'Photo téléversée'
          : prompt.required
            ? 'Photo conseillée pour rassurer les acheteurs'
            : 'Photo recommandée';

  return `
    <li class="app-guidance__item${prompt.completed ? ' is-complete' : ''}${
      prompt.uploadStatus === 'failed' ? ' is-error' : ''
    }${prompt.uploadStatus === 'uploading' ? ' is-uploading' : ''}">
      <div class="app-guidance__copy">
        <strong>${escapeHtml(prompt.label)}</strong>
        <span>${escapeHtml(statusCopy)}</span>
        ${
          prompt.previewUrl
            ? `
              <div class="app-guidance__preview">
                <img
                  class="app-guidance__preview-image"
                  src="${escapeAttribute(prompt.previewUrl)}"
                  alt="${escapeAttribute(prompt.label)}"
                />
              </div>
            `
            : ''
        }
      </div>
      <label
        class="app-guidance__action"
        for="app-guidance-${escapeAttribute(prompt.id)}-input"
      >
        ${escapeHtml(actionLabel)}
      </label>
      <input
        class="app-flow__file-input"
        id="app-guidance-${escapeAttribute(prompt.id)}-input"
        type="file"
        accept="image/*"
        capture="environment"
        data-input="guided-photo"
        data-prompt-id="${escapeAttribute(prompt.id)}"
      />
    </li>
  `;
}

export function renderPhotoGuidanceScreen({
  draft,
  uploadProgress = null,
  uploadsBusy = false,
}) {
  const prompts = getGuidedPhotoPrompts(draft);
  const missingPrompts = getMissingRequiredPhotoPrompts(draft);
  const hasUploadingPrompt = prompts.some((prompt) => prompt.uploadStatus === 'uploading');
  const isLocked = uploadsBusy || hasUploadingPrompt;

  return `
    <section class="app-flow app-flow--guidance">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="#capture">Retour</a>
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Étape 2</p>
          <h2 class="app-flow__title">Photos guidées</h2>
        </div>
      </header>

      <p class="app-flow__text">
        Zwibba a suggéré la catégorie <strong>${escapeHtml(
          formatCategoryLabel(draft.details.categoryId),
        )}</strong>. Vous pouvez publier avec la photo principale. Ajoutez d'autres vues pour améliorer la confiance et la modération.
      </p>

      <div class="app-guidance__status">
        <strong>${missingPrompts.length ? 'Photos complémentaires recommandées' : 'Photos complémentaires prêtes'}</strong>
        <span>
          ${
            missingPrompts.length
              ? `${missingPrompts.length} vue(s) recommandée(s) manquent encore, mais la publication reste possible pendant la bêta.`
              : 'Vous pouvez continuer vers le brouillon ou ajouter encore quelques vues.'
          }
        </span>
      </div>

      ${renderUploadProgress(uploadProgress)}

      <ul class="app-guidance__list">
        ${prompts.map(renderPrompt).join('')}
      </ul>

      <div class="app-flow__actions">
        ${
          isLocked
            ? '<button class="app-flow__button app-flow__button--secondary" type="button" disabled>Continuer vers le brouillon</button>'
            : '<a class="app-flow__button app-flow__button--secondary" href="#review">Continuer vers le brouillon</a>'
        }
      </div>
    </section>
  `;
}
