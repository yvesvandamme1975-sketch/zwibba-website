import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { escapeAttribute, escapeHtml } from '../../utils/rendering.mjs';

const defaultTermsTitle = 'Conditions générales d’utilisation';

// A document is only presentable when the server published a real URL for it.
// A draft catalog exposes no documents, so nothing is linked.
function isPresentableDocument(document) {
  return Boolean(
    document &&
      typeof document.url === 'string' &&
      document.url.trim() &&
      typeof document.title === 'string' &&
      document.title.trim(),
  );
}

export function renderLegalLinks({
  documents = [],
  excludeKind = '',
  label = 'Documents légaux',
} = {}) {
  const links = (Array.isArray(documents) ? documents : []).filter(
    (document) => isPresentableDocument(document) && document.kind !== excludeKind,
  );

  if (!links.length) {
    return '';
  }

  return `
      <nav class="app-legal__links" aria-label="${escapeAttribute(label)}">
        ${links
          .map(
            (document) =>
              `<a class="app-flow__link app-legal__link" href="${escapeAttribute(
                document.url,
              )}" target="_blank" rel="noopener noreferrer">${escapeHtml(document.title)}</a>`,
          )
          .join('\n        ')}
      </nav>
  `;
}

export function renderTermsAcceptanceFields({
  legal = null,
} = {}) {
  const terms = legal?.terms ?? null;

  // No published terms means no consent to collect and no version to prove.
  if (!terms?.version || !terms?.hash || !terms?.locale) {
    return '';
  }

  const title = terms.title || defaultTermsTitle;
  const termsLabel = isPresentableDocument(terms)
    ? `<a class="app-flow__link" href="${escapeAttribute(
        terms.url,
      )}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>`
    : escapeHtml(title);

  return `
      <input type="hidden" name="termsVersion" value="${escapeAttribute(terms.version)}" />
      <input type="hidden" name="termsHash" value="${escapeAttribute(terms.hash)}" />
      <input type="hidden" name="termsLocale" value="${escapeAttribute(terms.locale)}" />
      <div class="app-flow__note app-legal">
        <label class="app-legal__consent">
          <input type="checkbox" name="acceptedTerms" value="true" required />
          <span>J’ai lu et j’accepte les ${termsLabel} (version ${escapeHtml(
            terms.version,
          )}).</span>
        </label>
        ${renderLegalLinks({
          documents: legal?.documents ?? [],
          excludeKind: 'terms',
          label: 'Autres documents légaux',
        })}
        <p class="app-legal__hint">Les autres documents sont fournis pour information : seules les conditions générales demandent votre accord.</p>
      </div>
  `;
}

export function renderLegalStatusNotice({
  errorMessage = '',
  busy = false,
} = {}) {
  if (!errorMessage) {
    return '';
  }

  return `
      <div class="app-flow__note app-legal__notice" role="status">
        <p>${escapeHtml(errorMessage)}</p>
        <button class="app-flow__link app-legal__retry" type="button" data-action="retry-legal-status"${
          busy ? ' disabled' : ''
        }>${busy ? 'Vérification en cours…' : 'Réessayer'}</button>
      </div>
  `;
}

export function renderTermsAcceptanceScreen({
  busy = false,
  errorMessage = '',
  legal = null,
  statusErrorMessage = '',
} = {}) {
  const terms = legal?.terms ?? null;
  const fields = renderTermsAcceptanceFields({ legal });

  return `
    <section class="app-flow app-flow--auth">
      <header class="app-flow__header">
        <div class="app-flow__meta">
          ${renderInAppBrand({ compact: true })}
        </div>
        <div>
          <p class="app-flow__eyebrow">Votre compte</p>
          <h2 class="app-flow__title">Nouvelles conditions générales</h2>
        </div>
      </header>

      <div class="app-auth__card">
        <strong>Acceptation requise</strong>
        <p>${
          terms
            ? `Les conditions générales ont changé (version ${escapeHtml(
                terms.version,
              )}). Acceptez-les pour continuer avec votre compte.`
            : 'Les conditions générales applicables à votre compte n’ont pas pu être chargées.'
        }</p>
      </div>

      ${
        errorMessage
          ? `<div class="app-review__errors"><li>${escapeHtml(errorMessage)}</li></div>`
          : ''
      }

      ${renderLegalStatusNotice({ busy, errorMessage: statusErrorMessage })}

      ${
        fields
          ? `<form class="app-review__form" data-form="accept-terms" data-terms-version="${escapeAttribute(
              terms.version,
            )}" data-terms-hash="${escapeAttribute(
              terms.hash,
            )}" data-terms-locale="${escapeAttribute(terms.locale)}">
        ${fields}

        <div class="app-flow__actions">
          <button class="app-flow__button" type="submit"${busy ? ' disabled' : ''}>${
            busy ? 'Enregistrement en cours…' : 'Accepter et continuer'
          }</button>
        </div>
      </form>`
          : statusErrorMessage
            ? ''
            : `<div class="app-flow__actions">
          <button class="app-flow__button" type="button" data-action="retry-legal-status"${
            busy ? ' disabled' : ''
          }>${busy ? 'Vérification en cours…' : 'Réessayer'}</button>
        </div>`
      }

      <div class="app-flow__actions">
        <button class="app-flow__button app-flow__button--danger" type="button" data-action="logout">Se déconnecter et continuer sans compte</button>
      </div>
    </section>
  `;
}
