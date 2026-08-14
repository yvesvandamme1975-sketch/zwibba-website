import { escapeAttribute, escapeHtml } from '../utils/rendering.mjs';

function resolveCountryBadge(countryCode) {
  const normalizedCountry = String(countryCode || '').trim().toUpperCase();

  if (normalizedCountry === 'BE') {
    return {
      flag: '🇧🇪',
      label: 'Belgique',
    };
  }

  if (normalizedCountry === 'CD') {
    return {
      flag: '🇨🇩',
      label: 'RDC',
    };
  }

  return null;
}

export function renderInAppBrand({
  badge = '',
  compact = false,
  countryCode = globalThis.ZWIBBA_ACTIVE_COUNTRY_CODE || '',
  subtitle = '',
} = {}) {
  const badgeLabel = String(badge).trim();
  const country = resolveCountryBadge(countryCode);

  return `
    <div class="app-brand-mark${compact ? ' app-brand-mark--compact' : ''}" data-app-brand>
      <span class="app-brand-mark__icon" aria-hidden="true">
        <img src="/assets/brand/favicon.svg" alt="" width="28" height="28" />
      </span>
      <span class="app-brand-mark__copy">
        <strong>Zwibba</strong>
        ${subtitle ? `<span>${subtitle}</span>` : ''}
      </span>
      ${country ? `<a class="app-brand-mark__country" href="#buy" aria-label="Marché actif : ${escapeAttribute(country.label)}">${country.flag} <span>${escapeHtml(country.label)}</span></a>` : ''}
      ${badgeLabel ? `<span class="app-brand-mark__badge">${escapeHtml(badgeLabel)}</span>` : ''}
    </div>
  `;
}
