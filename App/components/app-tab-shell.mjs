import { escapeHtml } from '../utils/rendering.mjs';

const tabs = [
  { id: 'sell', href: '#sell', label: 'Vendre' },
  { id: 'buy', href: '#buy', label: 'Acheter' },
  { id: 'messages', href: '#messages', label: 'Messages' },
  { id: 'profile', href: '#profile', label: 'Profil' },
];

export function renderAppTabShell({
  activeTab = 'sell',
  content = '',
  unreadMessagesCount = 0,
} = {}) {
  const normalizedUnreadCount = Number.isFinite(unreadMessagesCount)
    ? Math.max(0, unreadMessagesCount)
    : 0;
  const unreadLabel = normalizedUnreadCount > 99 ? '99+' : String(normalizedUnreadCount);

  return `
    <div class="app-tab-shell" data-active-tab="${escapeHtml(activeTab)}">
      <div class="app-tab-shell__content">
        ${content}
      </div>
      <nav class="app-tab-shell__nav" aria-label="Navigation principale">
        ${tabs.map((tab) => `
          <a
            class="app-tab-shell__nav-item${tab.id === (activeTab === 'wallet' ? 'profile' : activeTab) ? ' is-active' : ''}"
            aria-current="${tab.id === (activeTab === 'wallet' ? 'profile' : activeTab) ? 'page' : 'false'}"
            href="${tab.href}"
            data-tab-id="${tab.id}"
            data-scroll-top-target="${tab.id}"
          >
            <span class="app-tab-shell__nav-label">${tab.label}</span>
            ${
              tab.id === 'messages' && normalizedUnreadCount > 0
                ? `<span class="app-tab-shell__nav-badge" aria-label="${escapeHtml(`${unreadLabel} message(s) non lus`)}">${escapeHtml(unreadLabel)}</span>`
                : ''
            }
          </a>
        `).join('')}
      </nav>
    </div>
  `;
}
