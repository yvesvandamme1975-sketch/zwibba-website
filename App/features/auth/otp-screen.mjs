import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { escapeHtml } from '../../utils/rendering.mjs';

export function renderOtpScreen({
  errorMessage = '',
  phoneNumber = '',
}) {
  return `
    <section class="app-flow app-flow--auth">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="#phone">Retour</a>
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Étape 2</p>
          <h2 class="app-flow__title">Confirmez le code OTP</h2>
        </div>
      </header>

      <div class="app-auth__card">
        <strong>Code envoyé</strong>
        <p>Nous simulons l'envoi vers ${escapeHtml(phoneNumber || 'votre numéro')}.</p>
      </div>

      ${
        errorMessage
          ? `<div class="app-review__errors"><li>${escapeHtml(errorMessage)}</li></div>`
          : ''
      }

      <form class="app-review__form" data-form="verify-otp">
        <label class="app-review__field app-review__field--full">
          <span>Code à 6 chiffres</span>
          <input class="app-auth__code" name="otpCode" type="text" inputmode="numeric" maxlength="6" />
        </label>

        <div class="app-flow__note">Prototype local: utilisez le code <strong>123456</strong>.</div>

        <div class="app-flow__actions">
          <button class="app-flow__button" type="submit">Vérifier et continuer</button>
        </div>
      </form>
    </section>
  `;
}
