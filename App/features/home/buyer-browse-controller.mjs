const staticRoutes = new Set([
  '#auth-welcome',
  '#capture',
  '#guidance',
  '#home',
  '#otp',
  '#phone',
  '#publish',
  '#review',
  '#success',
]);

function normalizeSearchValue(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesSearch(listing, searchQuery) {
  if (!searchQuery) {
    return true;
  }

  const haystack = [
    listing.title,
    listing.categoryLabel,
    listing.locationLabel,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(searchQuery);
}

function matchesCategory(listing, selectedCategoryId) {
  if (!selectedCategoryId) {
    return true;
  }

  return listing.categoryId === selectedCategoryId;
}

export function parseAppRoute(hash = '') {
  const normalizedHash = String(hash || '#home').trim().toLowerCase();

  if (normalizedHash.startsWith('#listing/')) {
    const slug = normalizedHash.slice('#listing/'.length).trim();

    if (slug) {
      return {
        slug,
        type: 'listing',
      };
    }
  }

  if (staticRoutes.has(normalizedHash)) {
    return {
      type: normalizedHash.replace(/^#/, '') || 'home',
    };
  }

  return {
    type: 'home',
  };
}

export function createBuyerBrowseController({
  listingsService,
} = {}) {
  if (!listingsService) {
    throw new Error('A listings service is required.');
  }

  const state = {
    detail: null,
    detailError: '',
    detailStatus: 'idle',
    feedItems: [],
    feedStatus: 'idle',
    searchQuery: '',
    selectedCategoryId: '',
  };

  return {
    state,

    async loadFeed() {
      state.feedStatus = 'loading';

      try {
        const response = await listingsService.listBrowseFeed();

        state.feedItems = (response.items ?? []).map((item) => ({
          ...item,
          categoryId: item.categoryId ?? '',
        }));
        state.feedStatus = 'ready';
      } catch (error) {
        state.feedStatus = 'error';
        throw error;
      }

      return state.feedItems;
    },

    async loadListing(slug) {
      state.detail = null;
      state.detailError = '';
      state.detailStatus = 'loading';

      try {
        state.detail = await listingsService.getListingDetail(slug);
        state.detailStatus = 'ready';
      } catch (error) {
        state.detailStatus = 'error';
        state.detailError =
          error instanceof Error ? error.message : "Impossible de charger cette annonce.";
      }

      return state.detail;
    },

    getFilteredFeed() {
      const normalizedSearch = normalizeSearchValue(state.searchQuery);

      return state.feedItems.filter(
        (listing) =>
          matchesSearch(listing, normalizedSearch) &&
          matchesCategory(listing, state.selectedCategoryId),
      );
    },

    getHomeSections() {
      const filteredItems = this.getFilteredFeed();

      return {
        featuredListings: filteredItems.slice(0, 2),
        recentListings: filteredItems.slice(2),
      };
    },

    setSearchQuery(value) {
      state.searchQuery = String(value || '');
    },

    setSelectedCategoryId(value) {
      state.selectedCategoryId = String(value || '');
    },
  };
}
