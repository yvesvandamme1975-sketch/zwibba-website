import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { escapeAttribute, escapeHtml } from '../../utils/rendering.mjs';

export function resolveDefaultPhonePrefix(countryCode) {
  return countryCode === 'BE' ? '+32' : '+243';
}

export function renderPhoneInputScreen({
  busy = false,
  errorMessage = '',
  phoneNumber = '+243',
} = {}) {
  return `
    <section class="app-flow app-flow--auth">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          ${renderInAppBrand({ compact: true })}
          <a class="app-flow__back" href="#auth-welcome">Retour</a>
        </div>
        <div>
          <p class="app-flow__eyebrow">Étape 1</p>
          <h2 class="app-flow__title">Entrez votre numéro</h2>
        </div>
      </header>

      ${
        errorMessage
          ? `<p class="app-review__errors" role="alert">${escapeHtml(errorMessage)}</p>`
          : ''
      }

      <form class="app-review__form" data-form="request-otp" aria-busy="${escapeAttribute(busy)}">
        <label class="app-review__field app-review__field--full">
          <span>Numéro de téléphone</span>
          <input name="phoneNumber" type="tel" autocomplete="tel" required${busy ? ' readonly' : ''} value="${escapeAttribute(phoneNumber)}" />
        </label>

        <div class="app-flow__actions">
          <button class="app-flow__button" type="submit"${busy ? ' disabled' : ''}>${busy ? 'Envoi du code…' : 'Recevoir le code'}</button>
        </div>
      </form>
    </section>
  `;
}
