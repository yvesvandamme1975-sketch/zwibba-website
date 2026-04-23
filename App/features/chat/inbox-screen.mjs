import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { escapeAttribute, escapeHtml } from '../../utils/rendering.mjs';

function renderInboxItem(item) {
  return `
    <a class="app-thread-card${item.unreadCount > 0 ? ' is-unread' : ''}" href="#thread/${escapeAttribute(item.id)}">
      <strong>${escapeHtml(item.listingTitle)}</strong>
      <span>${escapeHtml(item.participantName)}</span>
      <p>${escapeHtml(item.lastMessagePreview || 'Conversation prête à démarrer.')}</p>
      <small>${
        item.unreadCount > 0
          ? `<span class="app-thread-card__unread-badge">Nouveau</span> ${escapeHtml(String(item.unreadCount))} non lu(s)`
          : 'Conversation active'
      }</small>
    </a>
  `;
}

function sortUnreadFirst(items) {
  return items
    .map((item, index) => ({ index, item }))
    .sort((left, right) => {
      const leftHasUnread = Number(left.item?.unreadCount ?? 0) > 0;
      const rightHasUnread = Number(right.item?.unreadCount ?? 0) > 0;

      if (leftHasUnread !== rightHasUnread) {
        return leftHasUnread ? -1 : 1;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}

export function renderInboxScreen({
  items = [],
  state = 'loading',
} = {}) {
  if (state === 'locked') {
    return `
      <section class="app-flow app-screen">
        <header class="app-flow__header">
          <div class="app-flow__meta">
            ${renderInAppBrand({ compact: true })}
          </div>
          <div>
            <p class="app-flow__eyebrow">Messages</p>
            <h2 class="app-flow__title">Vérifiez votre numéro</h2>
          </div>
        </header>

        <div class="app-auth__card">
          <strong>Activez la messagerie Zwibba</strong>
          <p>Une vérification rapide suffit pour ouvrir vos conversations acheteur et vendeur.</p>
        </div>

        <div class="app-flow__actions">
          <a
            class="app-flow__button"
            href="#auth-welcome"
            data-action="begin-auth"
            data-intent="messages"
            data-return-route="#messages"
          >
            Commencer la vérification
          </a>
        </div>
      </section>
    `;
  }

  if (state === 'loading') {
    return `
      <section class="app-flow app-screen">
        <header class="app-flow__header">
          <div class="app-flow__meta">
            ${renderInAppBrand({ compact: true })}
          </div>
          <div>
            <p class="app-flow__eyebrow">Messages</p>
            <h2 class="app-flow__title">Chargement des conversations</h2>
          </div>
        </header>
      </section>
    `;
  }

  const sortedItems = sortUnreadFirst(items);

  return `
    <section class="app-flow app-screen">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Messages</p>
          <h2 class="app-flow__title">Messages Zwibba</h2>
        </div>
      </header>

      ${
        sortedItems.length === 0
          ? `
            <div class="app-auth__card">
              <strong>Aucune conversation pour le moment</strong>
              <p>Ouvrez une annonce et démarrez une conversation depuis la fiche.</p>
            </div>
          `
          : `<div class="app-thread-list">${sortedItems.map(renderInboxItem).join('')}</div>`
      }
    </section>
  `;
}
