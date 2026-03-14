import { renderPostEntryCard } from './post-entry-card.mjs';
import {
  renderFeaturedSection,
  renderRecentFeedSection,
} from './recent-feed-section.mjs';

function renderCategoryChips(categories) {
  return categories
    .map((category) => `<span class="app-home__chip">${category.label}</span>`)
    .join('');
}

export function renderHomeScreen({
  draft,
  categories,
  featuredListings,
  recentListings,
}) {
  return `
    <section class="app-home">
      <div class="app-home__topbar">
        <div class="app-home__heading">
          <strong>Zwibba</strong>
          <span>Vendez en un clic</span>
        </div>
        <span class="app-home__badge">Seller-first</span>
      </div>

      ${renderPostEntryCard({ draft })}

      <div class="app-home__search" aria-label="Recherche">
        <span>Rechercher un article, une catégorie ou un quartier</span>
      </div>

      <div class="app-home__chip-row">
        ${renderCategoryChips(categories)}
      </div>

      ${renderFeaturedSection({ listings: featuredListings })}
      ${renderRecentFeedSection({ listings: recentListings })}
    </section>
    <div class="app-home__bottom" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
}
