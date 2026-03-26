import { escapeHtml } from '../utils/rendering.mjs';

const tabs = [
  { id: 'sell', href: '#sell', label: 'Vendre' },
  { id: 'buy', href: '#buy', label: 'Acheter' },
  { id: 'messages', href: '#messages', label: 'Messages' },
  { id: 'wallet', href: '#wallet', label: 'Portefeuille' },
  { id: 'profile', href: '#profile', label: 'Profil' },
];

export function renderAppTabShell({
  activeTab = 'sell',
  content = '',
} = {}) {
  return `
    <div class="app-tab-shell" data-active-tab="${escapeHtml(activeTab)}">
      <div class="app-tab-shell__content">
        ${content}
      </div>
      <nav class="app-tab-shell__nav" aria-label="Navigation principale">
        ${tabs.map((tab) => `
          <a
            class="app-tab-shell__nav-item${tab.id === activeTab ? ' is-active' : ''}"
            href="${tab.href}"
            data-tab-id="${tab.id}"
          >
            ${tab.label}
          </a>
        `).join('')}
      </nav>
    </div>
  `;
}
