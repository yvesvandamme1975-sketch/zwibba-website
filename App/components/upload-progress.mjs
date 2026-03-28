import { escapeHtml } from '../utils/rendering.mjs';

export function renderUploadProgress(uploadProgress) {
  if (!uploadProgress?.title || !Array.isArray(uploadProgress.stages) || uploadProgress.stages.length === 0) {
    return '';
  }

  return `
    <div class="app-upload-progress" data-upload-stage="${escapeHtml(uploadProgress.activeStage || '')}">
      <strong>${escapeHtml(uploadProgress.title)}</strong>
      <div class="app-upload-progress__stages">
        ${uploadProgress.stages
          .map(
            (stage) => `
              <div class="app-upload-progress__stage is-${escapeHtml(stage.state || 'pending')}${
                stage.state === 'active' ? ' is-active' : ''
              }">
                <span class="app-upload-progress__dot" aria-hidden="true"></span>
                <span>${escapeHtml(stage.label)}</span>
              </div>
            `,
          )
          .join('')}
      </div>
    </div>
  `;
}
