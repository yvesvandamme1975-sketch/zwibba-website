import { renderAppTabShell } from './components/app-tab-shell.mjs';
import {
  areaOptions,
  conditionOptions,
  sellerCategories,
} from './demo-content.mjs';
import { renderAuthWelcomeScreen } from './features/auth/welcome-screen.mjs';
import { renderPhoneInputScreen } from './features/auth/phone-input-screen.mjs';
import { renderOtpScreen } from './features/auth/otp-screen.mjs';
import { renderInboxScreen } from './features/chat/inbox-screen.mjs';
import { createChatLiveRefreshController } from './features/chat/chat-live-refresh-controller.mjs';
import { renderThreadScreen } from './features/chat/thread-screen.mjs';
import { renderBuyScreen } from './features/home/buy-screen.mjs';
import {
  createBuyerBrowseController,
  parseAppRoute,
} from './features/home/buyer-browse-controller.mjs';
import { renderHomeScreen } from './features/home/home-screen.mjs';
import { renderListingDetailScreen } from './features/listings/listing-detail-screen.mjs';
import { renderCaptureScreen } from './features/post/capture-screen.mjs';
import { renderPhotoGuidanceScreen } from './features/post/photo-guidance-screen.mjs';
import { renderPublishGateScreen } from './features/post/publish-gate-screen.mjs';
import { renderReviewFormScreen } from './features/post/review-form-screen.mjs';
import { renderSuccessScreen } from './features/post/success-screen.mjs';
import { createUploadTaskQueue } from './features/post/upload-task-queue.mjs';
import { renderProfileScreen } from './features/profile/profile-screen.mjs';
import { renderWalletScreen } from './features/wallet/wallet-screen.mjs';
import { submitLivePublish } from './features/post/live-publish-flow.mjs';
import { getCategoryGuidance } from './models/category-guidance.mjs';
import {
  markDraftOtpVerified,
  updateListingDraft,
} from './models/listing-draft.mjs';
import { createAiDraftService } from './services/ai-draft.mjs';
import { createApiConfig } from './services/api-config.mjs';
import { createAuthService } from './services/auth-service.mjs';
import { createChatService } from './services/chat-service.mjs';
import { createDraftStorageService } from './services/draft-storage.mjs';
import { createImageCompressionService } from './services/image-compression.mjs';
import { createListingsService } from './services/listings-service.mjs';
import { createMediaService } from './services/media-service.mjs';
import { createSellerListingsService } from './services/seller-listings-service.mjs';
import { createWalletService } from './services/wallet-service.mjs';
import { createLiveDraftService } from './services/live-draft-service.mjs';
import {
  captureBuyerSearchRenderState,
  restoreBuyerSearchRenderState,
} from './utils/buyer-search-render-state.mjs';
import { resolveDiscardDraftRoute } from './utils/draft-discard-navigation.mjs';
import {
  captureReviewDraftRenderState,
  restoreReviewDraftRenderState,
} from './utils/review-draft-render-state.mjs';
import {
  captureScrollRenderState,
  restoreScrollRenderState,
} from './utils/scroll-render-state.mjs';
import { shouldRetainDraftAfterPublish } from './utils/post-publish-draft-state.mjs';
import {
  createPostFlowController,
  decidePublishGate,
  getMissingRequiredPhotoPrompts,
  validateDraftForPublish,
} from './features/post/post-flow-controller.mjs';

const appRoot = document.querySelector('[data-app-root]');

if (appRoot) {
  const apiConfig = createApiConfig({
    globalObject: window,
  });
  const draftStorage = createDraftStorageService({
    storage: window.localStorage,
  });
  const authService = createAuthService({
    apiBaseUrl: apiConfig.apiBaseUrl,
    fetchFn: window.fetch.bind(window),
    storage: window.localStorage,
  });
  const listingsService = createListingsService({
    apiBaseUrl: apiConfig.apiBaseUrl,
    fetchFn: window.fetch.bind(window),
  });
  const chatService = createChatService({
    apiBaseUrl: apiConfig.apiBaseUrl,
    fetchFn: window.fetch.bind(window),
  });
  const walletService = createWalletService({
    apiBaseUrl: apiConfig.apiBaseUrl,
    fetchFn: window.fetch.bind(window),
  });
  const sellerListingsService = createSellerListingsService({
    apiBaseUrl: apiConfig.apiBaseUrl,
    fetchFn: window.fetch.bind(window),
  });
  const mediaService = createMediaService({
    apiBaseUrl: apiConfig.apiBaseUrl,
    fetchFn: window.fetch.bind(window),
  });
  const liveDraftService = createLiveDraftService({
    apiBaseUrl: apiConfig.apiBaseUrl,
    fetchFn: window.fetch.bind(window),
  });
  const photoUploadQueue = createUploadTaskQueue({
    onStateChange: () => {
      renderApp();
    },
  });
  const chatLiveRefreshController = createChatLiveRefreshController();
  function buildUploadProgress(flow, stage) {
    if (!flow || !stage) {
      return null;
    }

    const flowConfig =
      flow === 'guided'
        ? {
            title: 'Ajout de la photo guidée',
            stages: ['compressing', 'uploading', 'complete'],
          }
        : {
            title: 'Préparation de la photo',
            stages: ['compressing', 'uploading', 'analyzing'],
          };
    const labels = {
      analyzing: 'Analyse IA',
      complete: 'Terminé',
      compressing: 'Compression',
      uploading: 'Téléversement',
    };
    const activeIndex = Math.max(flowConfig.stages.indexOf(stage), 0);

    return {
      activeStage: stage,
      stages: flowConfig.stages.map((stageId, index) => ({
        id: stageId,
        label: labels[stageId] ?? stageId,
        state:
          index < activeIndex ? 'complete' : index === activeIndex ? 'active' : 'pending',
      })),
      title: flowConfig.title,
    };
  }

  function syncUploadProgress(progressState) {
    if (!progressState) {
      state.uploadProgress = null;
      renderApp();
      return;
    }

    state.uploadProgress = buildUploadProgress(progressState.flow, progressState.stage);
    renderApp();
  }

  const postFlowController = createPostFlowController({
    draftStorage,
    imageCompressionService: createImageCompressionService(),
    aiDraftService: createAiDraftService({
      apiBaseUrl: apiConfig.apiBaseUrl,
      fetchFn: window.fetch.bind(window),
    }),
    mediaService,
    onUploadStageChange: syncUploadProgress,
    createPreviewUrl: (file) => window.URL.createObjectURL(file),
  });
  const buyerBrowseController = createBuyerBrowseController({
    listingsService,
  });
  const state = {
    authIntent: null,
    boostBusyListingId: '',
    boostMessage: '',
    busyLabel: '',
    buyerFeedPromise: null,
    buyerListingPromise: null,
    currentListingSlug: '',
    currentThreadId: '',
    draftResetSerial: 0,
    draft: draftStorage.loadDraft(),
    inboxError: '',
    inboxItems: [],
    inboxPromise: null,
    inboxStatus: 'idle',
    otpError: '',
    pendingChallenge: authService.getPendingChallenge(),
    phoneError: '',
    phoneNumber: authService.getPendingChallenge()?.phoneNumber ?? '+243',
    profileError: '',
    publishError: '',
    publishedDraft: null,
    publishOutcome: null,
    publishedListingRoute: '',
    publishedListingUrl: '',
    reviewErrors: [],
    selectedListingImageIndex: 0,
    sellerListings: [],
    sellerListingsPromise: null,
    sellerListingsStatus: 'idle',
    session: authService.loadSession(),
    thread: null,
    threadDraftMessage: '',
    threadError: '',
    threadPromise: null,
    threadStatus: 'idle',
    uploadProgress: null,
    wallet: {
      balanceCdf: 0,
      transactions: [],
    },
    walletError: '',
    walletPromise: null,
    walletStatus: 'idle',
  };
  let lastRenderedRouteKey = '';

  if (!window.location.hash) {
    window.location.hash = '#sell';
  }

  function getRoute() {
    return parseAppRoute(window.location.hash || '#sell');
  }

  function getRenderableRouteKey(route) {
    switch (route.type) {
      case 'listing':
        return `listing:${route.slug || ''}`;
      case 'thread':
        return `thread:${route.threadId || ''}`;
      default:
        return route.type;
    }
  }

  function parsePrice(rawValue) {
    const nextPrice = Number(rawValue);

    return Number.isFinite(nextPrice) && nextPrice > 0 ? nextPrice : null;
  }

  function slugifyTitle(value) {
    return String(value || '')
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-+|-+$/g, '');
  }

  function buildListingUrl(draft) {
    const previewByCategory = {
      electronics: '/annonce/ordinateur-portable-hp-elitebook/',
      fashion: '/annonce/robe-wax-africaine-taille-m/',
      home_garden: '/annonce/canape-3-places-style-contemporain/',
      phones_tablets: '/annonce/samsung-galaxy-a54-neuf-lubumbashi/',
      real_estate: '/annonce/appartement-2-chambres-quartier-industriel/',
      vehicles: '/annonce/toyota-hilux-2019-4x4/',
    };
    const previewUrl = previewByCategory[draft?.details.categoryId];

    if (previewUrl) {
      return previewUrl;
    }

    const slug = slugifyTitle(draft?.details.title || 'annonce-zwibba') || 'annonce-zwibba';

    return `/annonce/${slug}/`;
  }

  function buildBuyerListingRoute(listingSlug) {
    if (!listingSlug) {
      return '';
    }

    return `#listing/${encodeURIComponent(listingSlug)}`;
  }

  function persistDraft(nextDraft) {
    state.draft = postFlowController.saveDraft(nextDraft);
    return state.draft;
  }

  function beginAuthIntent(intent) {
    state.authIntent = intent;
    state.phoneError = '';
    state.otpError = '';
    window.location.hash = '#auth-welcome';
  }

  function resolveAuthContext() {
    switch (state.authIntent?.type) {
      case 'message':
      case 'messages':
        return 'messages';
      case 'wallet':
        return 'wallet';
      case 'profile':
        return 'profile';
      case 'publish':
      default:
        return 'publish';
    }
  }

  function resolveAuthBackHref() {
    return state.authIntent?.returnRoute || '#sell';
  }

  function getActiveTab(route) {
    switch (route.type) {
      case 'buy':
      case 'listing':
        return 'buy';
      case 'messages':
      case 'thread':
        return 'messages';
      case 'wallet':
        return 'wallet';
      case 'profile':
        return 'profile';
      default:
        return 'sell';
    }
  }

  function getTotalUnreadMessages() {
    return state.inboxItems.reduce((total, item) => {
      const unreadCount = Number(item?.unreadCount ?? 0);
      return total + (Number.isFinite(unreadCount) ? Math.max(0, unreadCount) : 0);
    }, 0);
  }

  function resolveRenderableRoute() {
    const route = getRoute();

    if (route.type === 'listing') {
      return route;
    }

    if (route.type === 'thread' && !state.session) {
      return {
        type: 'messages',
      };
    }

    if (
      !state.draft &&
      ![
        'auth-welcome',
        'buy',
        'capture',
        'listing',
        'messages',
        'otp',
        'phone',
        'profile',
        'sell',
        'thread',
        'wallet',
      ].includes(
        route.type,
      )
    ) {
      return {
        type: 'capture',
      };
    }

    if (route.type === 'otp' && !state.pendingChallenge) {
      return {
        type: 'phone',
      };
    }

    return route;
  }

  async function loadBuyerFeed() {
    if (state.buyerFeedPromise) {
      return state.buyerFeedPromise;
    }

    state.buyerFeedPromise = buyerBrowseController
      .loadFeed()
      .catch(() => undefined)
      .finally(() => {
        state.buyerFeedPromise = null;
        renderApp();
      });

    return state.buyerFeedPromise;
  }

  async function loadBuyerListing(slug) {
    if (!slug) {
      return null;
    }

    if (state.buyerListingPromise && state.currentListingSlug === slug) {
      return state.buyerListingPromise;
    }

    if (state.currentListingSlug !== slug) {
      state.selectedListingImageIndex = 0;
    }

    state.currentListingSlug = slug;
    state.buyerListingPromise = buyerBrowseController
      .loadListing(slug)
      .finally(() => {
        state.buyerListingPromise = null;
        renderApp();
      });

    return state.buyerListingPromise;
  }

  async function loadInbox() {
    if (!state.session) {
      return null;
    }

    if (state.inboxPromise) {
      return state.inboxPromise;
    }

    state.inboxStatus = 'loading';
    state.inboxError = '';
    state.inboxPromise = chatService
      .fetchInbox({
        session: state.session,
      })
      .then((payload) => {
        state.inboxItems = payload.items ?? [];
        state.inboxStatus = 'ready';
        return state.inboxItems;
      })
      .catch((error) => {
        state.inboxItems = [];
        state.inboxStatus = 'error';
        state.inboxError =
          error instanceof Error ? error.message : 'Impossible de charger vos messages.';
        return [];
      })
      .finally(() => {
        state.inboxPromise = null;
        renderApp();
      });

    return state.inboxPromise;
  }

  async function loadThread(threadId) {
    if (!state.session || !threadId) {
      return null;
    }

    if (state.threadPromise && state.currentThreadId === threadId) {
      return state.threadPromise;
    }

    state.currentThreadId = threadId;
    state.threadStatus = 'loading';
    state.threadError = '';
    state.threadPromise = chatService
      .fetchThread({
        session: state.session,
        threadId,
      })
      .then((thread) => {
        state.thread = thread;
        state.threadStatus = 'ready';
        state.inboxItems = state.inboxItems.map((item) =>
          item.id === thread.id
            ? {
                ...item,
                lastMessagePreview: thread.messages?.at(-1)?.body ?? item.lastMessagePreview,
                unreadCount: 0,
              }
            : item,
        );
        return thread;
      })
      .catch((error) => {
        state.thread = null;
        state.threadStatus = 'error';
        state.threadError =
          error instanceof Error ? error.message : 'Impossible de charger cette conversation.';
        return null;
      })
      .finally(() => {
        state.threadPromise = null;
        renderApp();
      });

    return state.threadPromise;
  }

  async function loadWallet() {
    if (!state.session) {
      return null;
    }

    if (state.walletPromise) {
      return state.walletPromise;
    }

    state.walletStatus = 'loading';
    state.walletError = '';
    state.walletPromise = walletService
      .fetchWallet({
        session: state.session,
      })
      .then((wallet) => {
        state.wallet = wallet;
        state.walletStatus = 'ready';
        return wallet;
      })
      .catch((error) => {
        state.wallet = {
          balanceCdf: 0,
          transactions: [],
        };
        state.walletStatus = 'error';
        state.walletError =
          error instanceof Error ? error.message : 'Impossible de charger le portefeuille.';
        return state.wallet;
      })
      .finally(() => {
        state.walletPromise = null;
        renderApp();
      });

    return state.walletPromise;
  }

  async function loadSellerListings() {
    if (!state.session) {
      return null;
    }

    if (state.sellerListingsPromise) {
      return state.sellerListingsPromise;
    }

    state.sellerListingsStatus = 'loading';
    state.profileError = '';
    state.sellerListingsPromise = sellerListingsService
      .listMine({
        session: state.session,
      })
      .then((payload) => {
        state.sellerListings = payload.items ?? [];
        state.sellerListingsStatus = 'ready';
        return state.sellerListings;
      })
      .catch((error) => {
        state.sellerListings = [];
        state.sellerListingsStatus = 'error';
        state.profileError =
          error instanceof Error ? error.message : 'Impossible de charger vos annonces.';
        return [];
      })
      .finally(() => {
        state.sellerListingsPromise = null;
        renderApp();
      });

    return state.sellerListingsPromise;
  }

  function primeBuyerRouteState(route) {
    if ((route.type === 'buy' || route.type === 'sell') && buyerBrowseController.state.feedStatus === 'idle') {
      void loadBuyerFeed();
    }

    if (
      route.type === 'listing' &&
      (!buyerBrowseController.state.detail ||
        state.currentListingSlug !== route.slug ||
        buyerBrowseController.state.detailStatus === 'idle')
    ) {
      void loadBuyerListing(route.slug);
    }

    if (route.type === 'messages' && state.session && state.inboxStatus === 'idle') {
      void loadInbox();
    }

    if (route.type === 'thread' && state.session) {
      if (!state.thread || state.currentThreadId !== route.threadId || state.threadStatus === 'idle') {
        void loadThread(route.threadId);
      }
    }

    if (route.type === 'wallet' && state.session && state.walletStatus === 'idle') {
      void loadWallet();
    }

    if (route.type === 'profile' && state.session && state.sellerListingsStatus === 'idle') {
      void loadSellerListings();
    }
  }

  function renderRoute(route) {
    const homeSections = buyerBrowseController.getHomeSections();
    const homeFeedStatus =
      buyerBrowseController.state.feedStatus === 'idle'
        ? 'loading'
        : buyerBrowseController.state.feedStatus;

    switch (route.type) {
      case 'capture':
        return renderCaptureScreen({
          busyLabel: state.busyLabel,
          draft: state.draft,
          uploadProgress: state.uploadProgress,
        });
      case 'guidance':
        return renderPhotoGuidanceScreen({
          draft: state.draft,
          uploadProgress: state.uploadProgress,
          uploadsBusy: photoUploadQueue.isBusy(),
        });
      case 'review':
        return renderReviewFormScreen({
          areaOptions,
          categories: sellerCategories,
          conditionOptions,
          draft: state.draft,
          validationErrors: state.reviewErrors,
        });
      case 'auth-welcome':
        return renderAuthWelcomeScreen({
          backHref: resolveAuthBackHref(),
          context: resolveAuthContext(),
        });
      case 'phone':
        return renderPhoneInputScreen({
          errorMessage: state.phoneError,
          phoneNumber: state.phoneNumber,
        });
      case 'otp':
        return renderOtpScreen({
          errorMessage: state.otpError,
          phoneNumber: state.pendingChallenge?.phoneNumber ?? state.phoneNumber,
        });
      case 'publish':
        return renderPublishGateScreen({
          busyLabel: state.busyLabel,
          draft: state.draft,
          errorMessage: state.publishError,
          session: state.session,
        });
      case 'success':
        return renderSuccessScreen({
          boostBusy: state.boostBusyListingId === state.publishOutcome?.id,
          boostMessage: state.boostMessage,
          draft: state.publishedDraft ?? state.draft,
          listingRoute: state.publishedListingRoute,
          listingUrl:
            state.publishedListingUrl || buildListingUrl(state.publishedDraft ?? state.draft),
          outcome: state.publishOutcome,
        });
      case 'listing':
        return renderListingDetailScreen({
          detail: buyerBrowseController.state.detail,
          errorMessage: buyerBrowseController.state.detailError,
          selectedImageIndex: state.selectedListingImageIndex,
          state: buyerBrowseController.state.detailStatus,
        });
      case 'messages':
        return renderInboxScreen({
          items: state.inboxItems,
          state: state.session
            ? state.inboxStatus === 'idle'
              ? 'loading'
              : state.inboxStatus === 'error'
                ? 'ready'
                : state.inboxStatus
            : 'locked',
        });
      case 'thread':
        return state.session
          ? renderThreadScreen({
              draftMessage: state.threadDraftMessage,
              isSending: state.threadStatus === 'sending',
              thread: state.threadStatus === 'error' ? null : state.thread,
            })
          : renderInboxScreen({
              state: 'locked',
            });
      case 'wallet':
        return renderWalletScreen({
          state: state.session
            ? state.walletStatus === 'idle'
              ? 'loading'
              : state.walletStatus
            : 'locked',
          wallet: state.wallet,
        });
      case 'profile':
        return renderProfileScreen({
          listings: state.sellerListings,
          session: state.session,
          state: state.session
            ? state.sellerListingsStatus === 'idle'
              ? 'loading'
              : state.sellerListingsStatus
            : 'locked',
        });
      case 'buy':
        return renderBuyScreen({
          categories: sellerCategories,
          featuredListings: homeSections.featuredListings,
          feedStatus: homeFeedStatus,
          recentListings: homeSections.recentListings,
          searchQuery: buyerBrowseController.state.searchQuery,
          selectedCategoryId: buyerBrowseController.state.selectedCategoryId,
        });
      case 'sell':
      default:
        return renderHomeScreen({
          draft: state.draft,
          categories: sellerCategories,
          featuredListings: homeSections.featuredListings,
          feedStatus: homeFeedStatus,
          recentListings: homeSections.recentListings,
          searchQuery: buyerBrowseController.state.searchQuery,
          selectedCategoryId: buyerBrowseController.state.selectedCategoryId,
        });
    }
  }

  function renderApp() {
    const route = resolveRenderableRoute();
    const routeKey = getRenderableRouteKey(route);
    const scrollRenderState =
      lastRenderedRouteKey === routeKey ? captureScrollRenderState(appRoot, window) : null;
    const buyerSearchRenderState = captureBuyerSearchRenderState(document.activeElement);
    const reviewDraftRenderState = captureReviewDraftRenderState(appRoot, document.activeElement);

    primeBuyerRouteState(route);
    chatLiveRefreshController.sync({
      refreshInbox: loadInbox,
      refreshThread: loadThread,
      route,
      session: state.session,
    });
    appRoot.innerHTML = renderAppTabShell({
      activeTab: getActiveTab(route),
      content: renderRoute(route),
      unreadMessagesCount: getTotalUnreadMessages(),
    });
    if (route.type === 'buy') {
      restoreBuyerSearchRenderState(appRoot, buyerSearchRenderState);
    }
    if (route.type === 'review') {
      restoreReviewDraftRenderState(appRoot, reviewDraftRenderState);
    }
    restoreScrollRenderState(appRoot, scrollRenderState, window);
    appRoot.dataset.appReady = 'true';
    appRoot.dataset.screen = route.type;
    lastRenderedRouteKey = routeKey;
  }

  async function handleCapture(file, draftResetSerial = state.draftResetSerial) {
    state.busyLabel = 'Compression, téléversement et analyse IA en cours...';
    renderApp();

    try {
      const nextDraft = await postFlowController.captureFirstPhoto(file);

      if (draftResetSerial !== state.draftResetSerial) {
        if (!state.draft) {
          draftStorage.clearDraft();
        }
        state.busyLabel = '';
        renderApp();
        return;
      }

      state.busyLabel = '';
      state.uploadProgress = null;
      state.draft = nextDraft;
      state.publishError = '';
      state.publishedDraft = null;
      state.publishOutcome = null;
      state.publishedListingRoute = '';
      state.publishedListingUrl = '';
      state.reviewErrors = [];
      window.location.hash =
        getMissingRequiredPhotoPrompts(nextDraft).length > 0 ? '#guidance' : '#review';
    } catch (error) {
      if (draftResetSerial !== state.draftResetSerial) {
        if (!state.draft) {
          draftStorage.clearDraft();
        }
        state.busyLabel = '';
        renderApp();
        return;
      }

      state.busyLabel = '';
      state.uploadProgress = null;
      state.draft = error?.draft ?? state.draft;
      renderApp();
    }
  }

  async function handleGuidedCapture(promptId, file, draftResetSerial = state.draftResetSerial) {
    state.busyLabel = 'Compression et téléversement de la photo guidée...';
    renderApp();

    try {
      const nextDraft = await postFlowController.addGuidedPhoto(promptId, file);

      if (draftResetSerial !== state.draftResetSerial) {
        if (!state.draft) {
          draftStorage.clearDraft();
        }
        state.busyLabel = '';
        renderApp();
        return;
      }

      state.draft = nextDraft;
      state.publishError = '';
      state.publishedDraft = null;
      state.reviewErrors = [];
      state.busyLabel = '';
      state.uploadProgress = null;
      renderApp();
    } catch (error) {
      if (draftResetSerial !== state.draftResetSerial) {
        if (!state.draft) {
          draftStorage.clearDraft();
        }
        state.busyLabel = '';
        renderApp();
        return;
      }

      state.busyLabel = '';
      state.uploadProgress = null;
      state.draft = error?.draft ?? state.draft;
      renderApp();
    }
  }

  async function handleDiscardDraft() {
    if (!state.draft) {
      return;
    }

    const confirmed = window.confirm(
      'Supprimer ce brouillon ?\n\nLes photos déjà téléversées et les informations saisies seront supprimées.',
    );

    if (!confirmed) {
      return;
    }

    const draftToDiscard = state.draft;

    state.busyLabel = 'Suppression du brouillon...';
    state.draftResetSerial += 1;
    photoUploadQueue.cancelAll();
    renderApp();

    try {
      if (draftToDiscard.remoteDraftId) {
        if (!state.session) {
          throw new Error('Connectez-vous avec le numéro du brouillon pour le supprimer.');
        }

        await liveDraftService.deleteDraft({
          draftId: draftToDiscard.remoteDraftId,
          session: state.session,
        });
      } else {
        const uploadedObjectKeys = draftToDiscard.photos
          .map((photo) => photo.objectKey || '')
          .filter(Boolean);

        if (uploadedObjectKeys.length) {
          await mediaService.deleteUploadedObjects({
            objectKeys: uploadedObjectKeys,
          });
        }
      }

      draftStorage.clearDraft();
      state.busyLabel = '';
      state.draft = null;
      state.publishError = '';
      state.publishedDraft = null;
      state.publishOutcome = null;
      state.publishedListingRoute = '';
      state.publishedListingUrl = '';
      state.reviewErrors = [];
      const nextDiscardRoute = resolveDiscardDraftRoute(window.location.hash || '#sell');

      if (nextDiscardRoute) {
        window.location.hash = nextDiscardRoute;
      } else {
        renderApp();
      }
    } catch (error) {
      state.busyLabel = '';
      renderApp();
      window.alert(
        error instanceof Error ? error.message : 'Impossible de supprimer le brouillon.',
      );
    }
  }

  function handleReviewSubmit(form) {
    if (!state.draft) {
      return;
    }

    const formData = new FormData(form);
    const categoryId = String(formData.get('categoryId') ?? '').trim();
    const nextDraft = updateListingDraft(
      state.draft,
      {
        details: {
          title: String(formData.get('title') ?? '').trim(),
          categoryId,
          condition: String(formData.get('condition') ?? '').trim(),
          priceCdf: parsePrice(formData.get('priceCdf')),
          description: String(formData.get('description') ?? '').trim(),
          area: String(formData.get('area') ?? '').trim(),
        },
        guidance: getCategoryGuidance(categoryId),
      },
    );

    persistDraft(nextDraft);
    state.publishError = '';
    state.publishedDraft = null;
    state.publishOutcome = null;
    state.publishedListingRoute = '';
    state.publishedListingUrl = '';
    state.reviewErrors = validateDraftForPublish(nextDraft, {
      uploadsBusy: photoUploadQueue.isBusy(),
    });

    if (state.reviewErrors.length) {
      renderApp();
      return;
    }

    const publishGate = decidePublishGate({
      draft: nextDraft,
      session: state.session,
      uploadsBusy: photoUploadQueue.isBusy(),
    });

    if (publishGate.nextRoute !== '#publish') {
      state.authIntent = {
        returnRoute: '#review',
        type: 'publish',
      };
    } else {
      state.authIntent = null;
    }

    window.location.hash = publishGate.nextRoute;
  }

  async function handlePhoneSubmit(form) {
    const formData = new FormData(form);

    try {
      const challenge = await authService.requestOtp({
        phoneNumber: String(formData.get('phoneNumber') ?? ''),
      });

      state.pendingChallenge = challenge;
      state.phoneNumber = challenge.phoneNumber;
      state.phoneError = '';
      state.otpError = '';
      window.location.hash = '#otp';
    } catch (error) {
      state.phoneError = error instanceof Error ? error.message : 'Numéro invalide.';
      renderApp();
    }
  }

  async function openThreadFromListing({
    listingId,
    listingSlug = '',
  }) {
    if (!state.session) {
      return;
    }

    const thread = await chatService.createThread({
      listingId,
      session: state.session,
    });

    state.thread = thread;
    state.threadStatus = 'ready';
    state.currentThreadId = thread.id;
    state.threadDraftMessage = '';
    state.inboxStatus = 'idle';
    state.authIntent = null;
    window.location.hash = `#thread/${encodeURIComponent(thread.id)}`;
    void loadInbox();
    if (listingSlug) {
      state.currentListingSlug = listingSlug;
    }
  }

  async function handleOtpSubmit(form) {
    const formData = new FormData(form);

    try {
      const session = await authService.verifyOtp({
        code: String(formData.get('otpCode') ?? '').trim(),
        phoneNumber: state.pendingChallenge?.phoneNumber ?? state.phoneNumber,
      });

      state.session = session;
      state.pendingChallenge = authService.getPendingChallenge();
      state.otpError = '';
      state.inboxStatus = 'idle';
      state.walletStatus = 'idle';
      state.sellerListingsStatus = 'idle';

      if (state.draft) {
        state.draft = markDraftOtpVerified(state.draft, {
          phoneNumber: session.phoneNumber,
        });
        draftStorage.saveDraft(state.draft);
      }

      if (state.authIntent?.type === 'message' && state.authIntent.listingId) {
        await openThreadFromListing({
          listingId: state.authIntent.listingId,
          listingSlug: state.authIntent.listingSlug,
        });
        return;
      }

      if (state.authIntent?.type === 'messages' || state.authIntent?.type === 'wallet' || state.authIntent?.type === 'profile') {
        const returnRoute = state.authIntent.returnRoute || '#profile';
        state.authIntent = null;
        window.location.hash = returnRoute;
        return;
      }

      state.authIntent = null;
      window.location.hash = '#publish';
    } catch (error) {
      state.otpError = error instanceof Error ? error.message : 'Code OTP invalide.';
      renderApp();
    }
  }

  async function handlePublishSubmit() {
    if (!state.draft || !state.session) {
      return;
    }

    try {
      state.busyLabel = 'Synchronisation et publication en cours...';
      state.publishError = '';
      renderApp();

      const result = await submitLivePublish({
        apiBaseUrl: apiConfig.apiBaseUrl,
        draft: state.draft,
        fetchFn: window.fetch.bind(window),
        session: state.session,
      });
      const listingRoute = buildBuyerListingRoute(result.outcome?.listingSlug);
      const shouldRetainDraft = shouldRetainDraftAfterPublish(result.outcome);

      state.busyLabel = '';
      state.publishedDraft = result.draft;
      if (shouldRetainDraft) {
        state.draft = draftStorage.saveDraft(result.draft);
      } else {
        draftStorage.clearDraft();
        state.draft = null;
      }
      state.publishOutcome = result.outcome;
      state.publishedListingRoute = listingRoute;
      state.publishedListingUrl =
        listingRoute ? `/App/${listingRoute}` : result.listingUrl || buildListingUrl(result.draft);
      state.sellerListingsStatus = 'idle';
      if (result.outcome?.status === 'approved') {
        buyerBrowseController.state.feedStatus = 'idle';
      }
      window.location.hash = '#success';
    } catch (error) {
      state.busyLabel = '';
      state.publishError =
        error instanceof Error ? error.message : "Impossible d'envoyer l'annonce.";
      renderApp();
    }
  }

  async function handleBoost(listingId) {
    if (!state.session || !listingId) {
      return;
    }

    state.boostBusyListingId = listingId;
    state.boostMessage = '';
    renderApp();

    try {
      const result = await walletService.activateBoost({
        listingId,
        session: state.session,
      });

      state.boostBusyListingId = '';
      state.boostMessage = result.statusLabel;
      state.walletStatus = 'idle';
      state.sellerListingsStatus = 'idle';
      void loadWallet();
      void loadSellerListings();
      renderApp();
    } catch (error) {
      state.boostBusyListingId = '';
      state.boostMessage =
        error instanceof Error ? error.message : 'Impossible d’activer le boost.';
      renderApp();
    }
  }

  async function handleSendThreadMessage(form) {
    if (!state.session) {
      return;
    }

    const formData = new FormData(form);
    const body = String(formData.get('threadMessage') ?? '').trim();
    const threadId = form.dataset.threadId || state.currentThreadId;

    if (!body || !threadId) {
      return;
    }

    state.threadStatus = 'sending';
    state.threadDraftMessage = body;
    renderApp();

    try {
      const thread = await chatService.sendMessage({
        body,
        session: state.session,
        threadId,
      });

      state.thread = thread;
      state.threadStatus = 'ready';
      state.threadDraftMessage = '';
      state.inboxStatus = 'idle';
      void loadInbox();
      renderApp();
    } catch (error) {
      state.threadStatus = 'ready';
      state.threadError =
        error instanceof Error ? error.message : 'Impossible d’envoyer ce message.';
      renderApp();
    }
  }

  async function handleListingLinkCopy(rawListingUrl) {
    const absoluteUrl = new URL(rawListingUrl, window.location.origin).toString();

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(absoluteUrl);
      return;
    }

    window.prompt('Copiez ce lien', absoluteUrl);
  }

  appRoot.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-action]');

    if (!trigger) {
      return;
    }

    event.preventDefault();

    if (trigger.dataset.action === 'filter-category') {
      const categoryId = trigger.dataset.categoryId || '';
      const nextCategoryId =
        buyerBrowseController.state.selectedCategoryId === categoryId ? '' : categoryId;

      buyerBrowseController.setSelectedCategoryId(nextCategoryId);
      renderApp();
      return;
    }

    if (trigger.dataset.action === 'discard-draft') {
      await handleDiscardDraft();
      return;
    }

    if (trigger.dataset.action === 'submit-publish') {
      await handlePublishSubmit();
      return;
    }

    if (trigger.dataset.action === 'copy-listing-link') {
      await handleListingLinkCopy(trigger.dataset.listingUrl || buildListingUrl(state.draft));
      return;
    }

    if (trigger.dataset.action === 'view-listing-link') {
      const listingRoute = trigger.dataset.listingRoute || '';

      if (listingRoute) {
        window.location.hash = listingRoute;
        return;
      }

      const listingUrl = trigger.dataset.listingUrl || buildListingUrl(state.draft);

      window.open(new URL(listingUrl, window.location.origin).toString(), '_blank', 'noopener');
      return;
    }

    if (trigger.dataset.action === 'begin-auth') {
      beginAuthIntent({
        returnRoute: trigger.dataset.returnRoute || '#sell',
        type: trigger.dataset.intent || 'profile',
      });
      return;
    }

    if (trigger.dataset.action === 'start-thread') {
      const listingId = trigger.dataset.listingId || '';
      const listingSlug = trigger.dataset.listingSlug || '';

      if (!state.session) {
        beginAuthIntent({
          listingId,
          listingSlug,
          returnRoute: `#listing/${encodeURIComponent(listingSlug)}`,
          type: 'message',
        });
        return;
      }

      await openThreadFromListing({
        listingId,
        listingSlug,
      });
      return;
    }

    if (trigger.dataset.action === 'select-listing-image') {
      state.selectedListingImageIndex = Number.parseInt(trigger.dataset.imageIndex || '0', 10) || 0;
      renderApp();
      return;
    }

    if (trigger.dataset.action === 'activate-boost') {
      if (!state.session) {
        beginAuthIntent({
          returnRoute: '#profile',
          type: 'profile',
        });
        return;
      }

      await handleBoost(trigger.dataset.listingId || '');
    }
  });

  appRoot.addEventListener('input', (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.name === 'buyerSearch') {
      buyerBrowseController.setSearchQuery(target.value);
      renderApp();
      return;
    }

    if (target.name === 'threadMessage') {
      state.threadDraftMessage = target.value;
    }
  });

  appRoot.addEventListener('change', async (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || target.type !== 'file') {
      return;
    }

    const [file] = Array.from(target.files ?? []);

    target.value = '';

    if (!file) {
      return;
    }

    if (target.dataset.input === 'capture-first-photo') {
      const draftResetSerial = state.draftResetSerial;
      const task = photoUploadQueue.run(() => handleCapture(file, draftResetSerial));
      renderApp();
      await task;
      renderApp();
      return;
    }

    if (target.dataset.input === 'guided-photo') {
      const draftResetSerial = state.draftResetSerial;
      const task = photoUploadQueue.run(() =>
        handleGuidedCapture(target.dataset.promptId || '', file, draftResetSerial),
      );
      renderApp();
      await task;
      renderApp();
    }
  });

  appRoot.addEventListener('submit', async (event) => {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    event.preventDefault();

    if (form.dataset.form === 'review-draft') {
      handleReviewSubmit(form);
      return;
    }

    if (form.dataset.form === 'request-otp') {
      await handlePhoneSubmit(form);
      return;
    }

    if (form.dataset.form === 'verify-otp') {
      await handleOtpSubmit(form);
      return;
    }

    if (form.dataset.form === 'send-thread-message') {
      await handleSendThreadMessage(form);
    }
  });

  window.addEventListener('hashchange', () => {
    renderApp();
  });

  renderApp();
}
