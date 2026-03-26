import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { escapeAttribute, escapeHtml } from '../../utils/rendering.mjs';

function renderMessage(message) {
  return `
    <article class="app-thread__bubble app-thread__bubble--${escapeAttribute(message.senderRole)}">
      <strong>${escapeHtml(message.senderRole === 'buyer' ? 'Acheteur' : 'Vendeur')}</strong>
      <p>${escapeHtml(message.body)}</p>
      <small>${escapeHtml(message.sentAtLabel)}</small>
    </article>
  `;
}

export function renderThreadScreen({
  draftMessage = '',
  isSending = false,
  thread,
} = {}) {
  if (!thread) {
    return `
      <section class="app-flow app-screen">
        <header class="app-flow__header">
          <div class="app-flow__meta">
            <a class="app-flow__back" href="#messages">Retour aux messages</a>
            ${renderInAppBrand({ compact: true })}
          </div>
          <div>
            <p class="app-flow__eyebrow">Messages</p>
            <h2 class="app-flow__title">Conversation introuvable</h2>
          </div>
        </header>
      </section>
    `;
  }

  return `
    <section class="app-flow app-screen">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="#messages">Retour aux messages</a>
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Messages</p>
          <h2 class="app-flow__title">${escapeHtml(thread.listingTitle)}</h2>
          <p class="app-flow__text">${escapeHtml(thread.participantName)}</p>
        </div>
      </header>

      <div class="app-thread" data-thread-id="${escapeAttribute(thread.id)}">
        <div class="app-thread__messages">
          ${thread.messages.map(renderMessage).join('')}
        </div>
      </div>

      <form class="app-thread__composer" data-form="send-thread-message" data-thread-id="${escapeAttribute(thread.id)}">
        <label class="app-thread__input" aria-label="Votre message">
          <input
            name="threadMessage"
            type="text"
            placeholder="Votre message"
            value="${escapeAttribute(draftMessage)}"
          />
        </label>
        <button class="app-flow__button" type="submit"${isSending ? ' disabled' : ''}>
          ${isSending ? 'Envoi...' : 'Envoyer'}
        </button>
      </form>
    </section>
  `;
}
