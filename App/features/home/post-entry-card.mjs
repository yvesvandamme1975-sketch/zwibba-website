export function renderPostEntryCard({ draft }) {
  const hasDraft = Boolean(draft);
  const title = hasDraft ? 'Continuer mon brouillon' : 'Prendre une photo';
  const description = hasDraft
    ? 'Reprenez votre annonce locale, validez les derniers champs puis publiez sans repartir de zéro.'
    : 'Prenez une photo et laissez Zwibba préparer votre brouillon avant la publication.';

  return `
    <section class="app-home__post-entry" data-post-entry-card>
      <strong>Vendeur d’abord</strong>
      <h2>${title}</h2>
      <p>${description}</p>
      <a href="#capture">${title}</a>
    </section>
  `;
}
