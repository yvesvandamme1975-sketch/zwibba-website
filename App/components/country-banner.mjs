export function renderCountrySuggestionBanner() {
  return `
    <aside class="country-banner" role="status">
      <p class="country-banner__text">Vous êtes en Belgique ? Découvrez les annonces Zwibba Belgique.</p>
      <div class="country-banner__actions">
        <button class="country-banner__button country-banner__button--primary" type="button" data-action="accept-country-suggestion">Voir la Belgique</button>
        <button class="country-banner__button" type="button" data-action="dismiss-country-suggestion">Rester sur la RDC</button>
      </div>
    </aside>
  `;
}
