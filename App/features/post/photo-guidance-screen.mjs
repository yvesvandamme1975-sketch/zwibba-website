import {
  getGuidedPhotoPrompts,
  getMissingRequiredPhotoPrompts,
} from './post-flow-controller.mjs';
import { escapeAttribute, escapeHtml } from '../../utils/rendering.mjs';

function renderPrompt(prompt) {
  return `
    <li class="app-guidance__item${prompt.completed ? ' is-complete' : ''}">
      <div>
        <strong>${escapeHtml(prompt.label)}</strong>
        <span>${prompt.required ? 'Photo requise' : 'Photo recommandée'}</span>
      </div>
      <button
        class="app-guidance__action"
        type="button"
        data-action="capture-guided-photo"
        data-prompt-id="${escapeAttribute(prompt.id)}"
      >
        ${prompt.completed ? 'Remplacer' : 'Ajouter'}
      </button>
    </li>
  `;
}

export function renderPhotoGuidanceScreen({ draft }) {
  const prompts = getGuidedPhotoPrompts(draft);
  const missingPrompts = getMissingRequiredPhotoPrompts(draft);

  return `
    <section class="app-flow app-flow--guidance">
      <header class="app-flow__header">
        <a class="app-flow__back" href="#capture">Retour</a>
        <div>
          <p class="app-flow__eyebrow">Étape 2</p>
          <h2 class="app-flow__title">Photos guidées</h2>
        </div>
      </header>

      <p class="app-flow__text">
        L'IA a suggéré la catégorie <strong>${escapeHtml(
          draft.details.categoryId || 'à confirmer',
        )}</strong>. Ajoutez les vues qui améliorent la confiance et la modération.
      </p>

      <div class="app-guidance__status">
        <strong>${missingPrompts.length ? 'Encore des vues requises' : 'Toutes les vues requises sont prêtes'}</strong>
        <span>
          ${missingPrompts.length ? `${missingPrompts.length} photo(s) guidée(s) manquent.` : 'Vous pouvez continuer vers le brouillon.'}
        </span>
      </div>

      <ul class="app-guidance__list">
        ${prompts.map(renderPrompt).join('')}
      </ul>

      <div class="app-flow__actions">
        <a class="app-flow__button app-flow__button--secondary" href="#review">Continuer vers le brouillon</a>
      </div>
    </section>
  `;
}
