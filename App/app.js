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
import { getCategoryGuidance } from './models/category-guidance.mjs';
import {
  markDraftOtpVerified,
  updateListingDraft,
} from './models/listing-draft.mjs';
import { createAiDraftService } from './services/ai-draft.mjs';
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
]);

if (appRoot) {
  const draftStorage = createDraftStorageService({
    storage: window.localStorage,
  });
  const authService = createAuthService({
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
          draft: state.draft,
          session: state.session,
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
    state.reviewErrors = [];
    window.location.hash =
      getMissingRequiredPhotoPrompts(nextDraft).length > 0 ? '#guidance' : '#review';
  }

  function handleGuidedCapture(promptId) {
    state.draft = postFlowController.addGuidedPhoto(promptId, buildGuidedPhoto(promptId));
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

  function handlePhoneSubmit(form) {
    const formData = new FormData(form);

    try {
      const challenge = authService.requestOtp({
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

  function handleOtpSubmit(form) {
    const formData = new FormData(form);

    try {
      const session = authService.verifyOtp({
        code: String(formData.get('otpCode') ?? '').trim(),
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
  });

  appRoot.addEventListener('submit', (event) => {
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
      handlePhoneSubmit(form);
      return;
    }

    if (form.dataset.form === 'verify-otp') {
      handleOtpSubmit(form);
    }
  });

  window.addEventListener('hashchange', () => {
    renderApp();
  });

  renderApp();
}
