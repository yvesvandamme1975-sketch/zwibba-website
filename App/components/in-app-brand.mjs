import { escapeAttribute, escapeHtml } from '../utils/rendering.mjs';

function resolveCountryLabel(countryCode) {
  const normalizedCountry = String(countryCode || '').trim().toUpperCase();

  if (normalizedCountry === 'BE') {
    return 'Belgique';
  }

  if (normalizedCountry === 'CD') {
    return 'RDC';
  }

  return null;
}

export function renderInAppBrand({
  allowMarketSwitch = false,
  countryCode = globalThis.ZWIBBA_ACTIVE_COUNTRY_CODE || '',
} = {}) {
  const country = resolveCountryLabel(countryCode);
  const activeCountry = country === 'Belgique' ? 'BE' : 'CD';
  const market = !country ? '' : allowMarketSwitch ? `
    <details class="app-topbar__market" data-market-menu data-country="${escapeAttribute(activeCountry)}">
      <summary class="app-topbar__country" data-market-toggle aria-label="${escapeAttribute(`Marché actif : ${country}. Choisir le marché`)}">${escapeHtml(country)}</summary>
      <div class="app-topbar__markets" role="group" aria-label="Choisir le marché">
        ${['CD', 'BE'].map((code) => `
          <button type="button" data-action="set-browse-country" data-country="${escapeAttribute(code)}" aria-pressed="${escapeAttribute(String(code === activeCountry))}">${escapeHtml(resolveCountryLabel(code))}</button>
        `).join('')}
      </div>
    </details>
  ` : `<span class="app-topbar__country" data-market-context aria-label="${escapeAttribute(`Marché actif : ${country}`)}">${escapeHtml(country)}</span>`;

  return `
    <div class="app-topbar" data-app-brand>
      <span class="app-brand-mark">
        <img class="app-brand-mark__icon" src="/assets/brand/favicon.svg" alt="" width="32" height="32" />
        <strong translate="no">Zwibba</strong>
      </span>
      ${market}
    </div>
  `;
}
