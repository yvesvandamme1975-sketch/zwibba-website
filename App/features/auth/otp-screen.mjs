import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { escapeAttribute, escapeHtml } from '../../utils/rendering.mjs';
import { renderTermsAcceptanceFields } from './terms-acceptance-screen.mjs';

export function renderOtpScreen({
  demoCode = '',
  errorMessage = '',
  legal = null,
  phoneNumber = '',
} = {}) {
  const terms = legal?.terms ?? null;
  const legalFields = renderTermsAcceptanceFields({ legal });

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
        <strong>Vérification du numéro</strong>
        <p>Saisissez le code reçu via WhatsApp pour ${escapeHtml(phoneNumber || 'votre numéro')}.</p>
      </div>

      ${
        errorMessage
          ? `<div class="app-review__errors"><li>${escapeHtml(errorMessage)}</li></div>`
          : ''
      }

      <form class="app-review__form" data-form="verify-otp"${
        terms
          ? ` data-terms-version="${escapeAttribute(
              terms.version,
            )}" data-terms-hash="${escapeAttribute(
              terms.hash,
            )}" data-terms-locale="${escapeAttribute(terms.locale)}"`
          : ''
      }>
        <label class="app-review__field app-review__field--full">
          <span>Code à 6 chiffres</span>
          <input class="app-auth__code" name="otpCode" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required />
        </label>

        ${legalFields}

        ${
          demoCode
            ? `<div class="app-flow__note">Compte de démonstration : utilisez le code <strong>${escapeHtml(
                demoCode,
              )}</strong>.</div>`
            : ''
        }

        <div class="app-flow__actions">
          <button class="app-flow__button" type="submit">Vérifier et continuer</button>
        </div>
      </form>
    </section>
  `;
}
