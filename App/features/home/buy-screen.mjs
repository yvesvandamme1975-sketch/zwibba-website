import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import { escapeAttribute, escapeHtml } from '../../utils/rendering.mjs';
import { renderFeaturedSection, renderRecentFeedSection } from './recent-feed-section.mjs';

function renderCategoryChips(categories, selectedCategoryId = '') {
  const allCategoryChip = `
      <button
        class="app-home__chip${!selectedCategoryId ? ' is-active' : ''}"
        type="button"
        data-action="filter-category"
        data-category-id=""
      >
        Toutes
      </button>
    `;

  return [
    allCategoryChip,
    ...categories
    .map((category) => `
      <button
        class="app-home__chip${category.id === selectedCategoryId ? ' is-active' : ''}"
        type="button"
        data-action="filter-category"
        data-category-id="${escapeAttribute(category.id)}"
      >
        ${escapeHtml(category.label)}
      </button>
    `),
  ]
    .join('');
}

export function renderBuyScreen({
  categories,
  featuredListings,
  feedStatus = 'ready',
  recentListings,
  searchQuery = '',
  selectedCategoryId = '',
}) {
  return `
    <section class="app-home app-screen app-screen--home">
      <div class="app-home__topbar">
        ${renderInAppBrand({ subtitle: 'Acheter en confiance' })}
        <span class="app-home__badge">Live beta</span>
      </div>

      <label class="app-home__search" aria-label="Recherche">
        <input
          name="buyerSearch"
          type="search"
          placeholder="Rechercher un article, une catégorie ou un quartier"
          value="${escapeAttribute(searchQuery)}"
        />
      </label>

      <div class="app-home__chip-row">
        ${renderCategoryChips(categories, selectedCategoryId)}
      </div>

      ${
        feedStatus === 'ready' && !featuredListings.length && !recentListings.length
          ? `
            <div class="app-home__empty-state">
              <strong>Aucune annonce ne correspond à vos filtres.</strong>
              <span>
                ${
                  searchQuery
                    ? `Essayez une autre recherche que ${escapeHtml(searchQuery)} ou retirez un filtre catégorie.`
                    : 'Essayez un autre mot-clé ou retirez un filtre catégorie.'
                }
              </span>
            </div>
          `
          : ''
      }

      ${renderFeaturedSection({ listings: featuredListings, status: feedStatus })}
      ${renderRecentFeedSection({ listings: recentListings, status: feedStatus })}
    </section>
  `;
}
