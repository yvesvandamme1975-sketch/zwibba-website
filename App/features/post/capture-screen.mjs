import { escapeAttribute, escapeHtml } from '../../utils/rendering.mjs';

function renderDraftResume(draft) {
  if (!draft) {
    return '';
  }

  return `
    <div class="app-capture__resume">
      <div>
        <strong>Brouillon en cours</strong>
        <span>${draft.photos.length} photo${draft.photos.length > 1 ? 's' : ''} · ${
          draft.canSyncToAccount ? 'Synchronisable' : 'Local uniquement'
        }</span>
      </div>
      <a class="app-flow__button app-flow__button--secondary" href="#review">Reprendre</a>
    </div>
  `;
}

function renderCaptureCard(option) {
  return `
    <button
      class="app-photo-preset"
      type="button"
      data-action="capture-demo-photo"
      data-photo-id="${escapeAttribute(option.id)}"
      style="--preset-accent:${escapeAttribute(option.accent)}; --preset-glow:${escapeAttribute(option.glow)};"
    >
      <span class="app-photo-preset__media" aria-hidden="true"></span>
      <span class="app-photo-preset__copy">
        <strong>${escapeHtml(option.label)}</strong>
        <small>${escapeHtml(option.description)}</small>
      </span>
    </button>
  `;
}

export function renderCaptureScreen({
  busyLabel = '',
  captureOptions,
  draft,
}) {
  return `
    <section class="app-flow app-flow--capture">
      <header class="app-flow__header">
        <a class="app-flow__back" href="#home">Retour</a>
        <div>
          <p class="app-flow__eyebrow">Étape 1</p>
          <h2 class="app-flow__title">Prenez la première photo</h2>
        </div>
      </header>

      <p class="app-flow__text">
        Commencez par une seule photo. Zwibba compresse l'image, suggère la catégorie et prépare le brouillon.
      </p>

      ${renderDraftResume(draft)}

      ${
        busyLabel
          ? `<div class="app-capture__busy">${escapeHtml(busyLabel)}</div>`
          : ''
      }

      <div class="app-capture__grid">
        ${captureOptions.map(renderCaptureCard).join('')}
      </div>
    </section>
  `;
}
