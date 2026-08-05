const staticRoutes = new Set([
  '#auth-welcome',
  '#buy',
  '#capture',
  '#capture-result',
  '#guidance',
  '#home',
  '#messages',
  '#otp',
  '#phone',
  '#profile',
  '#publish',
  '#review',
  '#sell',
  '#success',
  '#wallet',
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
  const normalizedHash = String(hash || '#sell').trim().toLowerCase();

  if (normalizedHash.startsWith('#listing/')) {
    const slug = normalizedHash.slice('#listing/'.length).trim();

    if (slug) {
      return {
        slug,
        type: 'listing',
      };
    }
  }

  if (normalizedHash.startsWith('#thread/')) {
    const threadId = normalizedHash.slice('#thread/'.length).trim();

    if (threadId) {
      return {
        threadId,
        type: 'thread',
      };
    }
  }

  if (normalizedHash.startsWith('#seller/')) {
    const sellerId = normalizedHash.slice('#seller/'.length).trim();

    if (sellerId) {
      return {
        sellerId,
        type: 'seller',
      };
    }
  }

  if (staticRoutes.has(normalizedHash)) {
    if (normalizedHash === '#home') {
      return {
        type: 'sell',
      };
    }

    return {
      type: normalizedHash.replace(/^#/, '') || 'sell',
    };
  }

  return {
    type: 'sell',
  };
}

export function getRenderableRouteKey(route = {}) {
  switch (route.type) {
    case 'listing':
      return `listing:${route.slug || ''}`;
    case 'thread':
      return `thread:${route.threadId || ''}`;
    case 'seller':
      return `seller:${route.sellerId || ''}`;
    default:
      return route.type;
  }
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

    async loadFeed({ countryCode } = {}) {
      state.feedStatus = 'loading';

      try {
        const response = await listingsService.listBrowseFeed({ countryCode });

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

    async loadListing(slug, { session } = {}) {
      state.detail = null;
      state.detailError = '';
      state.detailStatus = 'loading';

      try {
        state.detail = await listingsService.getListingDetail(slug, { session });
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
