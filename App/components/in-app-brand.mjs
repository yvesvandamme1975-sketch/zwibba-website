export function renderInAppBrand({
  compact = false,
  subtitle = '',
} = {}) {
  return `
    <div class="app-brand-mark${compact ? ' app-brand-mark--compact' : ''}" data-app-brand>
      <span class="app-brand-mark__icon" aria-hidden="true">
        <img src="/assets/brand/favicon.svg" alt="" width="28" height="28" />
      </span>
      <span class="app-brand-mark__copy">
        <strong>Zwibba</strong>
        ${subtitle ? `<span>${subtitle}</span>` : ''}
      </span>
    </div>
  `;
}
