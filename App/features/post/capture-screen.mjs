import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { renderUploadProgress } from '../../components/upload-progress.mjs';
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
      <div class="app-capture__resume-actions">
        <a class="app-flow__button app-flow__button--secondary" href="#review">Reprendre</a>
        <button class="app-flow__button app-flow__button--danger" type="button" data-action="discard-draft">Abandonner mon brouillon</button>
      </div>
    </div>
  `;
}

function resolvePrimaryPhoto(draft) {
  return draft?.photos?.find((photo) => photo.kind === 'primary') ?? draft?.photos?.[0] ?? null;
}

function renderPrimaryPhotoState(draft) {
  const photo = resolvePrimaryPhoto(draft);

  if (!photo) {
    return '';
  }

  const imageUrl = photo.publicUrl || photo.previewUrl || photo.url || '';
  const status =
    photo.uploadStatus === 'failed'
      ? 'Échec du téléversement'
      : photo.uploadStatus === 'uploading'
        ? 'Téléversement en cours'
        : 'Photo principale prête';
  const detail =
    photo.uploadStatus === 'failed'
      ? photo.uploadError || 'Réessayez avec une autre photo.'
      : photo.uploadStatus === 'uploading'
        ? 'La photo principale est en cours d’envoi vers Zwibba.'
        : 'La photo principale est enregistrée dans votre brouillon.';

  return `
    <article class="app-capture__selected${
      photo.uploadStatus === 'failed'
        ? ' is-failed'
        : photo.uploadStatus === 'uploading'
          ? ' is-uploading'
          : ' is-ready'
    }">
      ${
        imageUrl
          ? `
            <div class="app-capture__selected-media">
              <img
                class="app-capture__selected-image"
                src="${escapeAttribute(imageUrl)}"
                alt="${escapeAttribute('Photo principale Zwibba')}"
              />
            </div>
          `
          : ''
      }
      <div class="app-capture__selected-copy">
        <strong>${escapeHtml(status)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
    </article>
  `;
}

export function renderCaptureScreen({
  busyLabel = '',
  draft,
  uploadProgress = null,
}) {
  const primaryPhoto = resolvePrimaryPhoto(draft);
  const pickerLabel =
    primaryPhoto?.uploadStatus === 'failed'
      ? 'Réessayer avec une photo'
      : primaryPhoto
        ? 'Remplacer la photo'
        : 'Choisir ou prendre une photo';

  return `
    <section class="app-flow app-flow--capture">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="#home">Retour</a>
          ${renderInAppBrand({ compact: true })}
        </div>
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

      ${renderUploadProgress(uploadProgress)}

      ${renderPrimaryPhotoState(draft)}

      <div class="app-capture__grid">
        <div class="app-capture__picker-card">
          <strong>Photo principale</strong>
          <span>Utilisez une vraie photo depuis votre appareil. Sur mobile, l’appareil photo peut s’ouvrir directement.</span>
          <label class="app-capture__picker">
            <span>${escapeHtml(pickerLabel)}</span>
            <input
              class="app-flow__file-input app-flow__file-input--overlay"
              type="file"
              accept="image/*"
              capture="environment"
              data-input="capture-first-photo"
            />
          </label>
        </div>
      </div>
    </section>
  `;
}
