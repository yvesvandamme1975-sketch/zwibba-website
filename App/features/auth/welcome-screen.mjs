import { renderInAppBrand } from '../../components/in-app-brand.mjs';

export function renderAuthWelcomeScreen({
  backHref = '#sell',
  context = 'publish',
} = {}) {
  const contexts = {
    messages: {
      eyebrow: 'OTP pour la messagerie',
      reasonCopy:
        'Vous pouvez parcourir Zwibba librement. Le numéro est demandé avant le premier message pour sécuriser les conversations.',
      title: 'Activez votre messagerie Zwibba',
    },
    profile: {
      eyebrow: 'OTP pour le profil',
      reasonCopy:
        'Votre numéro permet de retrouver vos annonces, vos messages et votre portefeuille test sur ce navigateur.',
      title: 'Vérifiez votre session vendeur',
    },
    publish: {
      eyebrow: 'OTP à la publication',
      reasonCopy:
        'Vous pouvez commencer le brouillon sans compte. Le numéro n’est demandé qu’au moment de publier, pour synchroniser le brouillon et limiter le spam.',
      title: 'Publiez seulement après vérification',
    },
    wallet: {
      eyebrow: 'OTP pour le portefeuille',
      reasonCopy:
        'Le portefeuille bêta et les opérations de boost sont réservés aux sessions vérifiées.',
      title: 'Activez votre portefeuille test',
    },
  };
  const currentContext = contexts[context] ?? contexts.publish;

  return `
    <section class="app-flow app-flow--auth">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          <a class="app-flow__back" href="${backHref}">Retour</a>
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">${currentContext.eyebrow}</p>
          <h2 class="app-flow__title">${currentContext.title}</h2>
        </div>
      </header>

      <div class="app-auth__card">
        <strong>Pourquoi maintenant ?</strong>
        <p>
          ${currentContext.reasonCopy}
        </p>
      </div>

      <div class="app-flow__actions">
        <a class="app-flow__button" href="#phone">Continuer avec mon numéro</a>
      </div>
    </section>
  `;
}
