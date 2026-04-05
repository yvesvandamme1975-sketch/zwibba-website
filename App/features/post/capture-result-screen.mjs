import { conditionOptions, sellerCategories } from '../../demo-content.mjs';
import { renderInAppBrand } from '../../components/in-app-brand.mjs';
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
  return draft?.photos?.find((photo) => photo.kind === 'primary') ?? draft?.photos?.[0] ?? null;
}

function resolveDraftPrimaryImage(draft) {
  const primaryPhoto = resolveDraftPrimaryPhoto(draft);

  return primaryPhoto?.publicUrl || primaryPhoto?.url || primaryPhoto?.previewUrl || '';
}

function renderReadyAiSummary(draft) {
  return `
    <div class="app-capture-result__summary-card">
      <div class="app-capture-result__summary-copy">
        <strong>Brouillon préparé par IA</strong>
        <span>${escapeHtml(draft.ai.message || 'Brouillon préparé à partir de votre photo.')}</span>
      </div>
      <div class="app-capture-result__summary-fields">
        <div class="app-capture-result__summary-field">
          <strong>Titre</strong>
          <span>${escapeHtml(draft.details.title || 'à confirmer')}</span>
        </div>
        <div class="app-capture-result__summary-field">
          <strong>Catégorie</strong>
          <span>${escapeHtml(formatCategoryLabel(draft.details.categoryId))}</span>
        </div>
        <div class="app-capture-result__summary-field">
          <strong>État</strong>
          <span>${escapeHtml(formatConditionLabel(draft.details.condition))}</span>
        </div>
        <div class="app-capture-result__summary-field">
          <strong>Description</strong>
          <span>${escapeHtml(draft.details.description || 'à compléter à l’étape suivante')}</span>
        </div>
      </div>
    </div>
  `;
}

function renderManualFallbackSummary(draft) {
  return `
    <div class="app-capture-result__summary-card app-capture-result__summary-card--manual">
      <div class="app-capture-result__summary-copy">
        <strong>Analyse IA indisponible</strong>
        <span>${escapeHtml(
          draft.ai.message || "L'IA n'a pas pu préparer ce brouillon. Continuez manuellement.",
        )}</span>
      </div>
    </div>
  `;
}

export function renderCaptureResultScreen({
  continueHref = '#review',
  continueLabel = 'Continuer vers le brouillon',
  draft,
}) {
  const primaryImageUrl = resolveDraftPrimaryImage(draft);
  const imageAlt = draft?.details?.title || 'Photo téléversée Zwibba';
  const isManualFallback = draft?.ai?.status === 'manual_fallback';

  return `
    <section class="app-flow app-flow--capture-result">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="#capture">Retour</a>
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Étape 1</p>
          <h2 class="app-flow__title">Photo confirmée</h2>
        </div>
      </header>

      <div class="app-capture-result__status-cards">
        <div class="app-capture-result__status-card">
          <strong>Photo téléversée</strong>
          <span>Votre première photo est bien enregistrée dans le brouillon.</span>
        </div>
        <div class="app-capture-result__status-card${
          isManualFallback ? ' is-warning' : ' is-success'
        }">
          <strong>${isManualFallback ? 'Analyse IA indisponible' : 'Analyse IA terminée'}</strong>
          <span>${escapeHtml(
            draft?.ai?.message ||
              (isManualFallback
                ? "Continuez manuellement à l'étape suivante."
                : 'Les champs ont été préparés à partir de votre photo.'),
          )}</span>
        </div>
      </div>

      ${
        primaryImageUrl
          ? `
            <div class="app-capture-result__hero-media">
              <img
                class="app-capture-result__hero-image"
                src="${escapeAttribute(primaryImageUrl)}"
                alt="${escapeAttribute(imageAlt)}"
                loading="eager"
              />
            </div>
          `
          : `
            <div class="app-capture-result__hero-media app-capture-result__hero-media--fallback">
              <strong>Aperçu indisponible</strong>
              <span>La photo est bien enregistrée, mais l’aperçu reste indisponible pour le moment.</span>
            </div>
          `
      }

      ${
        isManualFallback
          ? renderManualFallbackSummary(draft)
          : renderReadyAiSummary(draft)
      }

      <div class="app-flow__actions">
        <a class="app-flow__button app-flow__button--secondary" href="${escapeAttribute(
          continueHref,
        )}">${escapeHtml(continueLabel)}</a>
      </div>
    </section>
  `;
}
