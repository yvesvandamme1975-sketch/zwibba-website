import { escapeHtml, formatCdf } from '../../utils/rendering.mjs';

export function renderPublishGateScreen({ draft, session }) {
  return `
    <section class="app-flow app-flow--publish">
      <header class="app-flow__header">
        <a class="app-flow__back" href="#review">Retour</a>
        <div>
          <p class="app-flow__eyebrow">Étape 4</p>
          <h2 class="app-flow__title">Prêt à publier</h2>
        </div>
      </header>

      <div class="app-publish__status${session ? ' is-verified' : ''}">
        <strong>${session ? 'Session vérifiée' : 'Vérification requise'}</strong>
        <span>
          ${
            session
              ? `Le brouillon peut maintenant être synchronisé pour ${escapeHtml(session.phoneNumber)}.`
              : "Vérifiez votre numéro pour synchroniser le brouillon avant l'envoi en modération."
          }
        </span>
      </div>

      <div class="app-publish__summary">
        <strong>${escapeHtml(draft.details.title || 'Annonce en préparation')}</strong>
        <span>${escapeHtml(draft.details.area || 'Zone à confirmer')}</span>
        <em>${escapeHtml(formatCdf(draft.details.priceCdf))}</em>
      </div>

      <div class="app-flow__actions">
        ${
          session
            ? '<a class="app-flow__button" href="#home">Retour à l’accueil</a>'
            : '<a class="app-flow__button" href="#auth-welcome">Vérifier mon numéro</a>'
        }
        <a class="app-flow__button app-flow__button--secondary" href="#review">Modifier le brouillon</a>
      </div>
    </section>
  `;
}
