import { escapeAttribute, escapeHtml } from '../utils/rendering.mjs';

const ICONS = {
  whatsapp:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.96.51 3.79 1.41 5.39L2 22l4.83-1.27a9.9 9.9 0 0 0 5.21 1.48h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2Zm0 1.82c2.16 0 4.18.84 5.71 2.37a8.02 8.02 0 0 1 2.37 5.71c0 4.45-3.62 8.08-8.08 8.08a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-2.86.75.76-2.79-.19-.31a8.04 8.04 0 0 1-1.23-4.32c0-4.45 3.63-8.08 8.08-8.08Zm-2.6 4.04c-.13 0-.34.05-.52.24-.18.19-.69.67-.69 1.64s.71 1.9.81 2.03c.1.13 1.39 2.21 3.43 3.01 1.7.67 2.04.54 2.41.5.37-.03 1.19-.48 1.36-.95.17-.47.17-.87.12-.95-.05-.08-.18-.13-.37-.23-.19-.1-1.19-.59-1.37-.65-.18-.07-.32-.1-.45.1-.13.19-.51.65-.63.78-.12.13-.23.15-.42.05-.19-.1-.81-.3-1.54-.95-.57-.51-.95-1.13-1.07-1.32-.12-.19-.01-.29.09-.39.09-.09.19-.23.29-.34.1-.12.13-.2.19-.33.06-.13.03-.24-.02-.34-.05-.1-.45-1.08-.61-1.48-.16-.39-.32-.34-.45-.34Z"/></svg>',
  facebook:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z"/></svg>',
  instagram:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2.2c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 1.8c-3.15 0-3.5.01-4.74.07-.9.04-1.39.19-1.71.32-.43.17-.74.37-1.06.69-.32.32-.52.63-.69 1.06-.13.32-.28.81-.32 1.71-.06 1.24-.07 1.59-.07 4.74s.01 3.5.07 4.74c.04.9.19 1.39.32 1.71.17.43.37.74.69 1.06.32.32.63.52 1.06.69.32.13.81.28 1.71.32 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c.9-.04 1.39-.19 1.71-.32.43-.17.74-.37 1.06-.69.32-.32.52-.63.69-1.06.13-.32.28-.81.32-1.71.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.04-.9-.19-1.39-.32-1.71a2.86 2.86 0 0 0-.69-1.06 2.86 2.86 0 0 0-1.06-.69c-.32-.13-.81-.28-1.71-.32-1.24-.06-1.59-.07-4.74-.07Zm0 3.06a4.94 4.94 0 1 1 0 9.88 4.94 4.94 0 0 1 0-9.88Zm0 1.8a3.14 3.14 0 1 0 0 6.28 3.14 3.14 0 0 0 0-6.28Zm5.14-3.2a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z"/></svg>',
  tiktok:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1Z"/></svg>',
  link:
    '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M9.5 13.5a3 3 0 0 0 4.24 0l3-3a3 3 0 0 0-4.24-4.24l-1 1M14.5 10.5a3 3 0 0 0-4.24 0l-3 3a3 3 0 0 0 4.24 4.24l1-1"/></svg>',
};

function option(action, iconKey, label, dataCtx) {
  return `
          <button class="app-share-menu__option" type="button" data-action="${action}" ${dataCtx}>
            <span class="app-share-menu__icon app-share-menu__icon--${iconKey}">${ICONS[iconKey]}</span>
            <span class="app-share-menu__label">${escapeHtml(label)}</span>
          </button>`;
}

export function renderShareMenu(menu) {
  if (!menu) {
    return '';
  }

  const mode = menu.mode === 'story' ? 'story' : 'post';
  const dataCtx = [
    `data-listing-url="${escapeAttribute(menu.url || '')}"`,
    `data-share-slug="${escapeAttribute(menu.slug || '')}"`,
    `data-share-title="${escapeAttribute(menu.title || '')}"`,
    `data-story-image-url="${escapeAttribute(menu.storyImageUrl || '')}"`,
  ].join(' ');

  const hint =
    mode === 'story'
      ? "L'image story est téléchargée : postez-la sur votre story ou statut."
      : "Le lien de l'annonce est partagé, avec son aperçu image.";

  return `
    <div class="app-share-menu" data-action="close-share-menu" role="presentation">
      <div class="app-share-menu__sheet" data-action="share-menu-sheet" role="dialog" aria-modal="true" aria-label="Partager l'annonce">
        <span class="app-share-menu__handle" aria-hidden="true"></span>
        <h2 class="app-share-menu__title">Partager</h2>
        <div class="app-share-menu__segmented" role="group" aria-label="Mode de partage">
          <button type="button" class="app-share-menu__seg${mode === 'post' ? ' app-share-menu__seg--active' : ''}" data-action="share-mode-post" aria-pressed="${mode === 'post'}">En post</button>
          <button type="button" class="app-share-menu__seg${mode === 'story' ? ' app-share-menu__seg--active' : ''}" data-action="share-mode-story" aria-pressed="${mode === 'story'}">En story</button>
        </div>
        <div class="app-share-menu__options">
${option('share-whatsapp-chat', 'whatsapp', 'WhatsApp', dataCtx)}
${option('share-facebook', 'facebook', 'Facebook', dataCtx)}
${option('share-instagram', 'instagram', 'Instagram', dataCtx)}
${option('share-tiktok', 'tiktok', 'TikTok', dataCtx)}
${option('copy-listing-link', 'link', 'Copier le lien', dataCtx)}
        </div>
        <p class="app-share-menu__hint">${escapeHtml(hint)}</p>
        <button class="app-share-menu__cancel" type="button" data-action="close-share-menu">Annuler</button>
      </div>
    </div>`;
}
