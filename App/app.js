import { featuredListings, recentListings, sellerCategories } from './demo-content.mjs';
import { renderHomeScreen } from './features/home/home-screen.mjs';
import { createDraftStorageService } from './services/draft-storage.mjs';

const appRoot = document.querySelector('[data-app-root]');

if (appRoot) {
  const draftStorage = createDraftStorageService({
    storage: window.localStorage,
  });

  const currentDraft = draftStorage.loadDraft();

  appRoot.innerHTML = renderHomeScreen({
    draft: currentDraft,
    categories: sellerCategories,
    featuredListings,
    recentListings,
  });
  appRoot.dataset.appReady = 'true';
}
