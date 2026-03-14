function renderListingCard(listing) {
  return `
    <article class="app-home__listing-card">
      <div class="app-home__listing-media" aria-hidden="true"></div>
      <div class="app-home__listing-copy">
        <strong>${listing.title}</strong>
        <em>${listing.priceLabel}</em>
        <span>${listing.location}</span>
        <small>${listing.publishedAt}</small>
      </div>
    </article>
  `;
}

export function renderRecentFeedSection({ listings }) {
  return `
    <section class="app-home__section" data-recent-feed-section>
      <div class="app-home__section-head">
        <h3>Récent</h3>
        <span>Flux vendeur</span>
      </div>
      <div class="app-home__recent-feed">
        ${listings.map(renderListingCard).join('')}
      </div>
    </section>
  `;
}

export function renderFeaturedSection({ listings }) {
  return `
    <section class="app-home__section">
      <div class="app-home__section-head">
        <h3>En avant</h3>
        <span>À partager vite</span>
      </div>
      <div class="app-home__featured-row">
        ${listings.map(renderListingCard).join('')}
      </div>
    </section>
  `;
}
