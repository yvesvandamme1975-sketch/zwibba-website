import {
  areaOptions,
  conditionOptions,
  demoCaptureOptions,
  featuredListings,
  recentListings,
  sellerCategories,
} from './demo-content.mjs';
import { renderAuthWelcomeScreen } from './features/auth/welcome-screen.mjs';
import { renderPhoneInputScreen } from './features/auth/phone-input-screen.mjs';
import { renderOtpScreen } from './features/auth/otp-screen.mjs';
import { renderHomeScreen } from './features/home/home-screen.mjs';
import { renderCaptureScreen } from './features/post/capture-screen.mjs';
import { renderPhotoGuidanceScreen } from './features/post/photo-guidance-screen.mjs';
import { renderPublishGateScreen } from './features/post/publish-gate-screen.mjs';
import { renderReviewFormScreen } from './features/post/review-form-screen.mjs';
import { renderSuccessScreen } from './features/post/success-screen.mjs';
import { submitLivePublish } from './features/post/live-publish-flow.mjs';
import { getCategoryGuidance } from './models/category-guidance.mjs';
import {
  markDraftOtpVerified,
  updateListingDraft,
} from './models/listing-draft.mjs';
import { createAiDraftService } from './services/ai-draft.mjs';
import { createApiConfig } from './services/api-config.mjs';
import { createAuthService } from './services/auth-service.mjs';
import { createDraftStorageService } from './services/draft-storage.mjs';
import { createImageCompressionService } from './services/image-compression.mjs';
import {
  createPostFlowController,
  decidePublishGate,
  getMissingRequiredPhotoPrompts,
  validateDraftForPublish,
} from './features/post/post-flow-controller.mjs';

const appRoot = document.querySelector('[data-app-root]');
const appRoutes = new Set([
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
  const postFlowController = createPostFlowController({
    draftStorage,
    imageCompressionService: createImageCompressionService(),
    aiDraftService: createAiDraftService(),
  });
  const state = {
    busyLabel: '',
    draft: draftStorage.loadDraft(),
    otpError: '',
    pendingChallenge: authService.getPendingChallenge(),
    phoneError: '',
    phoneNumber: authService.getPendingChallenge()?.phoneNumber ?? '+243',
    publishError: '',
    publishOutcome: null,
    publishedListingUrl: '',
    reviewErrors: [],
    session: authService.loadSession(),
  };

  if (!window.location.hash) {
    window.location.hash = '#home';
  }

  function getRoute() {
    const normalizedHash = (window.location.hash || '#home').toLowerCase();

    return appRoutes.has(normalizedHash) ? normalizedHash : '#home';
  }

  function parsePrice(rawValue) {
    const nextPrice = Number(rawValue);

    return Number.isFinite(nextPrice) && nextPrice > 0 ? nextPrice : null;
  }

  function buildGuidedPhoto(promptId) {
    return {
      id: `guided-${promptId}-${Date.now()}`,
      previewUrl: `/assets/demo/${promptId}.jpg`,
      sizeBytes: 900_000,
    };
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

  function persistDraft(nextDraft) {
    state.draft = postFlowController.saveDraft(nextDraft);
    return state.draft;
  }

  function resolveRenderableRoute() {
    const route = getRoute();

    if (!state.draft && route !== '#home' && route !== '#capture') {
      return '#capture';
    }

    if (route === '#otp' && !state.pendingChallenge) {
      return '#phone';
    }

    return route;
  }

  function renderRoute(route) {
    switch (route) {
      case '#capture':
        return renderCaptureScreen({
          busyLabel: state.busyLabel,
          captureOptions: demoCaptureOptions,
          draft: state.draft,
        });
      case '#guidance':
        return renderPhotoGuidanceScreen({
          draft: state.draft,
        });
      case '#review':
        return renderReviewFormScreen({
          areaOptions,
          categories: sellerCategories,
          conditionOptions,
          draft: state.draft,
          validationErrors: state.reviewErrors,
        });
      case '#auth-welcome':
        return renderAuthWelcomeScreen();
      case '#phone':
        return renderPhoneInputScreen({
          errorMessage: state.phoneError,
          phoneNumber: state.phoneNumber,
        });
      case '#otp':
        return renderOtpScreen({
          errorMessage: state.otpError,
          phoneNumber: state.pendingChallenge?.phoneNumber ?? state.phoneNumber,
        });
      case '#publish':
        return renderPublishGateScreen({
          busyLabel: state.busyLabel,
          draft: state.draft,
          errorMessage: state.publishError,
          session: state.session,
        });
      case '#success':
        return renderSuccessScreen({
          draft: state.draft,
          listingUrl: state.publishedListingUrl || buildListingUrl(state.draft),
          outcome: state.publishOutcome,
        });
      case '#home':
      default:
        return renderHomeScreen({
          draft: state.draft,
          categories: sellerCategories,
          featuredListings,
          recentListings,
        });
    }
  }

  function renderApp() {
    const route = resolveRenderableRoute();

    appRoot.innerHTML = renderRoute(route);
    appRoot.dataset.appReady = 'true';
    appRoot.dataset.screen = route.replace('#', '');
  }

  async function handleCapture(photoId) {
    const photo = demoCaptureOptions.find((option) => option.id === photoId);

    if (!photo) {
      return;
    }

    state.busyLabel = 'Compression et analyse IA en cours...';
    renderApp();

    const nextDraft = await postFlowController.captureFirstPhoto(photo);

    state.busyLabel = '';
    state.draft = nextDraft;
    state.publishError = '';
    state.publishOutcome = null;
    state.publishedListingUrl = '';
    state.reviewErrors = [];
    window.location.hash =
      getMissingRequiredPhotoPrompts(nextDraft).length > 0 ? '#guidance' : '#review';
  }

  function handleGuidedCapture(promptId) {
    state.draft = postFlowController.addGuidedPhoto(promptId, buildGuidedPhoto(promptId));
    state.publishError = '';
    state.reviewErrors = [];
    renderApp();
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
    state.publishOutcome = null;
    state.publishedListingUrl = '';
    state.reviewErrors = validateDraftForPublish(nextDraft);

    if (state.reviewErrors.length) {
      renderApp();
      return;
    }

    const publishGate = decidePublishGate({
      draft: nextDraft,
      session: state.session,
    });

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

      if (state.draft) {
        state.draft = markDraftOtpVerified(state.draft, {
          phoneNumber: session.phoneNumber,
        });
        draftStorage.saveDraft(state.draft);
      }

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

      state.busyLabel = '';
      state.draft = draftStorage.saveDraft(result.draft);
      state.publishOutcome = result.outcome;
      state.publishedListingUrl = result.listingUrl || buildListingUrl(result.draft);
      window.location.hash = '#success';
    } catch (error) {
      state.busyLabel = '';
      state.publishError =
        error instanceof Error ? error.message : "Impossible d'envoyer l'annonce.";
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

    if (trigger.dataset.action === 'capture-demo-photo') {
      await handleCapture(trigger.dataset.photoId);
      return;
    }

    if (trigger.dataset.action === 'capture-guided-photo') {
      handleGuidedCapture(trigger.dataset.promptId);
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
      const listingUrl = trigger.dataset.listingUrl || buildListingUrl(state.draft);

      window.open(new URL(listingUrl, window.location.origin).toString(), '_blank', 'noopener');
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
    }
  });

  window.addEventListener('hashchange', () => {
    renderApp();
  });

  renderApp();
}
