import { escapeHtml } from '../utils/rendering.mjs';

export function renderInAppBrand({
  badge = '',
  compact = false,
  subtitle = '',
} = {}) {
  const badgeLabel = String(badge).trim();

  return `
    <div class="app-brand-mark${compact ? ' app-brand-mark--compact' : ''}" data-app-brand>
      <span class="app-brand-mark__icon" aria-hidden="true">
        <img src="/assets/brand/favicon.svg" alt="" width="28" height="28" />
      </span>
      <span class="app-brand-mark__copy">
        <strong>Zwibba</strong>
        ${subtitle ? `<span>${subtitle}</span>` : ''}
      </span>
      ${badgeLabel ? `<span class="app-brand-mark__badge">${escapeHtml(badgeLabel)}</span>` : ''}
    </div>
  `;
}
