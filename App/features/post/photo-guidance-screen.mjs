import {
  getGuidedPhotoPrompts,
} from './post-flow-controller.mjs';
import { conditionOptions, sellerCategories } from '../../demo-content.mjs';
import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { renderUploadProgress } from '../../components/upload-progress.mjs';
import { escapeAttribute, escapeHtml } from '../../utils/rendering.mjs';

const categoryLabels = new Map(
  sellerCategories.map((category) => [category.id, category.label]),
);
const conditionLabels = new Map(
  conditionOptions.map((option) => [option.value, option.label]),
);

function formatCategoryLabel(categoryId) {
  return categoryLabels.get(categoryId) ?? (categoryId || 'à confirmer');
}

function formatConditionLabel(condition) {
  return conditionLabels.get(condition) ?? (condition || 'à confirmer');
}

function resolveDraftPrimaryPhoto(draft) {
  return draft.photos.find((photo) => photo.kind === 'primary') ?? draft.photos[0] ?? null;
}

function resolveDraftPrimaryImage(draft) {
  const primaryPhoto = resolveDraftPrimaryPhoto(draft);

  return primaryPhoto?.publicUrl || primaryPhoto?.url || primaryPhoto?.previewUrl || '';
}

function renderPrimaryPhotoCard(draft) {
  const primaryImageUrl = resolveDraftPrimaryImage(draft);
  const imageAlt = draft.details.title || 'Photo principale téléversée';

  return `
    <div class="app-guidance__hero-card">
      <div class="app-guidance__hero-copy">
        <strong>Photo principale téléversée</strong>
        <span>${
          primaryImageUrl
            ? 'Aperçu prêt pour la publication'
            : 'La photo est enregistrée, mais l’aperçu reste indisponible pour le moment.'
        }</span>
      </div>
      ${
        primaryImageUrl
          ? `
            <div class="app-guidance__hero-media">
              <img
                class="app-guidance__hero-image"
                src="${escapeAttribute(primaryImageUrl)}"
                alt="${escapeAttribute(imageAlt)}"
                loading="eager"
              />
            </div>
          `
          : `
            <div class="app-guidance__hero-media app-guidance__hero-media--fallback">
              <strong>Aperçu indisponible</strong>
              <span>Continuez vers le brouillon pour vérifier la photo avant publication.</span>
            </div>
          `
      }
    </div>
  `;
}

function renderReadyAiSummary(draft) {
  return `
    <div class="app-guidance__summary-card">
      <div class="app-guidance__summary-copy">
        <strong>Brouillon préparé par IA</strong>
        <span>${escapeHtml(draft.ai.message || 'Brouillon préparé à partir de votre photo.')}</span>
      </div>
      <div class="app-guidance__summary-fields">
        <div class="app-guidance__summary-field">
          <strong>Titre</strong>
          <span>${escapeHtml(draft.details.title || 'à confirmer')}</span>
        </div>
        <div class="app-guidance__summary-field">
          <strong>Catégorie</strong>
          <span>${escapeHtml(formatCategoryLabel(draft.details.categoryId))}</span>
        </div>
        <div class="app-guidance__summary-field">
          <strong>État</strong>
          <span>${escapeHtml(formatConditionLabel(draft.details.condition))}</span>
        </div>
        <div class="app-guidance__summary-field">
          <strong>Description</strong>
          <span>${escapeHtml(draft.details.description || 'à compléter à l’étape suivante')}</span>
        </div>
      </div>
    </div>
  `;
}

function renderManualFallbackSummary(draft) {
  return `
    <div class="app-guidance__summary-card app-guidance__summary-card--manual">
      <div class="app-guidance__summary-copy">
        <strong>Complétion manuelle à l'étape suivante</strong>
        <span>${escapeHtml(
          draft.ai.message || "L'IA n'a pas pu préparer ce brouillon. Continuez manuellement.",
        )}</span>
      </div>
    </div>
  `;
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
          : prompt.publishRequired
            ? 'Photo obligatoire pour publier'
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
  const blockingPrompts = prompts.filter((prompt) => prompt.publishRequired && !prompt.completed);
  const incompletePrompts = prompts.filter((prompt) => !prompt.completed);
  const hasUploadingPrompt = prompts.some((prompt) => prompt.uploadStatus === 'uploading');
  const isLocked = uploadsBusy || hasUploadingPrompt;
  const statusTitle = blockingPrompts.length
    ? 'Photos obligatoires manquantes'
    : incompletePrompts.length
      ? 'Photos complémentaires recommandées'
      : 'Photos complémentaires prêtes';
  const statusBody = blockingPrompts.length
    ? `${blockingPrompts.length} vue(s) sont obligatoires avant la publication.`
    : incompletePrompts.length
      ? `${incompletePrompts.length} vue(s) recommandée(s) manquent encore, mais la publication reste possible pendant la bêta.`
      : 'Vous pouvez continuer vers le brouillon ou ajouter encore quelques vues.';

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

      ${renderPrimaryPhotoCard(draft)}

      ${
        draft.ai.status === 'ready'
          ? renderReadyAiSummary(draft)
          : renderManualFallbackSummary(draft)
      }

      <div class="app-guidance__status">
        <strong>${escapeHtml(statusTitle)}</strong>
        <span>${escapeHtml(statusBody)}</span>
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
