import { escapeHtml } from '../utils/rendering.mjs';

const tabs = [
  { id: 'sell', href: '#sell', icon: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7v10M7 12h10"/>', label: 'Vendre' },
  { id: 'buy', href: '#buy', icon: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>', label: 'Acheter' },
  { id: 'messages', href: '#messages', icon: '<path d="M7 3h10a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-5l-5 4v-4a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Z"/>', label: 'Messages' },
  { id: 'profile', href: '#profile', icon: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2Z"/>', label: 'Profil' },
];

// content and footer are trusted HTML from the application renderers.
export function renderAppTabShell({
  activeTab = 'sell',
  content = '',
  footer = '',
  unreadMessagesCount = 0,
} = {}) {
  const normalizedUnreadCount = Number.isFinite(unreadMessagesCount)
    ? Math.max(0, unreadMessagesCount)
    : 0;
  const unreadLabel = normalizedUnreadCount > 99 ? '99+' : String(normalizedUnreadCount);

  return `
    <div class="app-tab-shell${footer ? ' app-tab-shell--with-footer' : ''}" data-active-tab="${escapeHtml(activeTab)}">
      <div class="app-tab-shell__content">
        ${content}
      </div>
      ${footer}
      <nav class="app-tab-shell__nav" aria-label="Navigation principale">
        ${tabs.map((tab) => `
          <a
            class="app-tab-shell__nav-item${tab.id === (activeTab === 'wallet' ? 'profile' : activeTab) ? ' is-active' : ''}"
            aria-current="${tab.id === (activeTab === 'wallet' ? 'profile' : activeTab) ? 'page' : 'false'}"
            href="${tab.href}"
            data-tab-id="${tab.id}"
            data-scroll-top-target="${tab.id}"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${tab.icon}</svg>
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
