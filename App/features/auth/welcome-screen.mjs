import { renderInAppBrand } from '../../components/in-app-brand.mjs';

export function renderAuthWelcomeScreen() {
  return `
    <section class="app-flow app-flow--auth">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="#review">Retour</a>
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">OTP à la publication</p>
          <h2 class="app-flow__title">Publiez seulement après vérification</h2>
        </div>
      </header>

      <div class="app-auth__card">
        <strong>Pourquoi maintenant ?</strong>
        <p>
          Vous pouvez commencer le brouillon sans compte. Le numéro n'est demandé qu'au moment de publier,
          pour synchroniser le brouillon et limiter le spam.
        </p>
      </div>

      <div class="app-flow__actions">
        <a class="app-flow__button" href="#phone">Continuer avec mon numéro</a>
      </div>
    </section>
  `;
}
