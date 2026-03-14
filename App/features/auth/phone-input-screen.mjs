import { escapeAttribute, escapeHtml } from '../../utils/rendering.mjs';

export function renderPhoneInputScreen({
  errorMessage = '',
  phoneNumber = '+243',
}) {
  return `
    <section class="app-flow app-flow--auth">
      <header class="app-flow__header">
        <a class="app-flow__back" href="#auth-welcome">Retour</a>
        <div>
          <p class="app-flow__eyebrow">Étape 1</p>
          <h2 class="app-flow__title">Entrez votre numéro</h2>
        </div>
      </header>

      ${
        errorMessage
          ? `<div class="app-review__errors"><li>${escapeHtml(errorMessage)}</li></div>`
          : ''
      }

      <form class="app-review__form" data-form="request-otp">
        <label class="app-review__field app-review__field--full">
          <span>Numéro de téléphone</span>
          <input name="phoneNumber" type="tel" value="${escapeAttribute(phoneNumber)}" />
        </label>

        <div class="app-flow__actions">
          <button class="app-flow__button" type="submit">Recevoir le code</button>
        </div>
      </form>
    </section>
  `;
}
