export function renderPostEntryCard({ draft }) {
  const hasDraft = Boolean(draft);
  const title = hasDraft ? 'Continuer mon brouillon' : 'Prendre une photo';
  const description = hasDraft
    ? 'Reprenez votre annonce locale, validez les derniers champs puis publiez sans repartir de zéro.'
    : 'Prenez une photo et laissez Zwibba préparer votre brouillon avant la publication.';
  const href = hasDraft ? '#review' : '#capture';

  return `
    <section class="app-home__post-entry" data-post-entry-card>
      <strong>Vendre sur Zwibba</strong>
      <h2>${title}</h2>
      <p>${description}</p>
      <div class="app-home__post-entry-actions">
        <a href="${href}">${title}</a>
        <a class="app-flow__button app-flow__button--secondary" href="#profile">Mes annonces</a>
        ${
          hasDraft
            ? '<button class="app-flow__button app-flow__button--danger" type="button" data-action="discard-draft">Abandonner mon brouillon</button>'
            : ''
        }
      </div>
    </section>
  `;
}
