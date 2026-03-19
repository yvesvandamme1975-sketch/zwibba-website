import { renderInAppBrand } from '../../components/in-app-brand.mjs';
import {
  escapeAttribute,
  escapeHtml,
} from '../../utils/rendering.mjs';
import { renderPostEntryCard } from './post-entry-card.mjs';
import {
  renderFeaturedSection,
  renderRecentFeedSection,
} from './recent-feed-section.mjs';

function renderCategoryChips(categories, selectedCategoryId = '') {
  return categories
    .map((category) => `
      <button
        class="app-home__chip${category.id === selectedCategoryId ? ' is-active' : ''}"
        type="button"
        data-action="filter-category"
        data-category-id="${escapeAttribute(category.id)}"
      >
        ${escapeHtml(category.label)}
      </button>
    `)
    .join('');
}

export function renderHomeScreen({
  draft,
  categories,
  feedStatus = 'ready',
  featuredListings,
  recentListings,
  searchQuery = '',
  selectedCategoryId = '',
}) {
  return `
    <section class="app-home">
      <div class="app-home__topbar">
        ${renderInAppBrand({ subtitle: 'Vendez en un clic' })}
        <span class="app-home__badge">Seller-first</span>
      </div>

      ${renderPostEntryCard({ draft })}

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
    <div class="app-home__bottom" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
}
