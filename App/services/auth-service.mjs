import { resolvePhoneCountry } from '../utils/phone-country.mjs';

export const authStorageKey = 'zwibba_app_auth';
const demoOtpCode = '123456';

function parseStoredState(serializedState) {
  if (!serializedState) {
    return {
      pendingChallenge: null,
      session: null,
    };
  }

  try {
    return JSON.parse(serializedState);
  } catch {
    return {
      pendingChallenge: null,
      session: null,
    };
  }
}

function preferredLocale(market) {
  return market === 'BE' ? 'fr-BE' : 'fr-CD';
}

// The published catalog carries every market and locale. The app speaks French,
// so it keeps the French document of the browsed market unless a locale is asked for.
export function filterLegalDocuments(documents, { market = '', locale = '' } = {}) {
  const list = Array.isArray(documents) ? documents : [];

  if (!market) {
    return list;
  }

  const marketDocuments = list.filter((document) => document?.market === market);
  const requestedLocale = locale || preferredLocale(market);
  const localized = marketDocuments.filter((document) => document.locale === requestedLocale);

  return localized.length
    ? localized
    : marketDocuments.filter((document) => document.locale === preferredLocale(market));
}

export function buildLegalRequirement(catalog, { market = '', locale = '' } = {}) {
  if (!catalog?.active) {
    return null;
  }

  const documents = filterLegalDocuments(catalog.documents, { market, locale });
  const terms = documents.find((document) => document.kind === 'terms') ?? null;

  return terms ? { required: true, terms, documents } : null;
}

export function createAuthService({
  storage,
  key = authStorageKey,
  apiBaseUrl = '',
  fetchFn = null,
  otpCode = demoOtpCode,
} = {}) {
  if (!storage) {
    throw new Error('A storage adapter is required.');
  }

  function loadState() {
    return parseStoredState(storage.getItem(key));
  }

  function saveState(nextState) {
    storage.setItem(key, JSON.stringify(nextState));
    return nextState;
  }

  // Server errors stay verbatim: the API owns the legal wording, and the status
  // code tells the caller whether the version went stale (409) or the account
  // must accept a new version before continuing (428).
  async function parseError(response, fallbackMessage) {
    let payload = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const message =
      typeof payload?.message === 'string' && payload.message.trim()
        ? payload.message
        : fallbackMessage;
    const error = new Error(message);
    error.status = response.status;

    if (typeof payload?.code === 'string' && payload.code) {
      error.code = payload.code;
    }

    throw error;
  }

  function hasLiveApi() {
    return Boolean(apiBaseUrl && typeof fetchFn === 'function');
  }

  function authorizationHeaders(session) {
    const sessionToken = String(session?.sessionToken ?? '').trim();

    if (!sessionToken) {
      throw new Error('Session manquante.');
    }

    return {
      authorization: `Bearer ${sessionToken}`,
    };
  }

  async function getLegalDocuments({ market = '', locale = '' } = {}) {
    if (!hasLiveApi()) {
      return {
        active: false,
        documents: [],
      };
    }

    const response = await fetchFn(`${apiBaseUrl}/auth/legal-documents`, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      return parseError(response, 'Documents légaux indisponibles.');
    }

    const catalog = await response.json();

    return {
      active: Boolean(catalog?.active),
      documents: filterLegalDocuments(catalog?.documents, { market, locale }),
    };
  }

  return {
    clearSession() {
      const state = loadState();
      saveState({
        ...state,
        session: null,
      });
    },
    getPendingChallenge() {
      return loadState().pendingChallenge;
    },
    loadSession() {
      return loadState().session;
    },
    getLegalDocuments,
    // Reloads the published version presented with a pending challenge without
    // asking for a new OTP: the code already sent stays valid.
    async refreshPendingChallengeLegal() {
      const challenge = loadState().pendingChallenge;

      if (!challenge) {
        return null;
      }

      const catalog = await getLegalDocuments();
      const state = loadState();
      const currentChallenge = state.pendingChallenge;

      // The challenge may have been consumed or replaced while the catalog was
      // loading: a late answer never revives or rewrites another challenge.
      if (
        !currentChallenge ||
        currentChallenge.challengeId !== challenge.challengeId ||
        currentChallenge.phoneNumber !== challenge.phoneNumber
      ) {
        return currentChallenge ?? null;
      }

      const legal = buildLegalRequirement(catalog, {
        market: resolvePhoneCountry(challenge.phoneNumber),
        locale: challenge.legal?.terms?.locale ?? '',
      });
      const nextChallenge = {
        ...currentChallenge,
        legal,
      };

      saveState({
        ...state,
        pendingChallenge: nextChallenge,
      });

      return nextChallenge;
    },
    async getLegalStatus(session) {
      if (!hasLiveApi()) {
        // No API configured means no published contract to enforce here; the
        // server stays authoritative whenever the app runs against a real API.
        return {
          active: false,
          needsAcceptance: false,
          terms: null,
          documents: [],
        };
      }

      const response = await fetchFn(`${apiBaseUrl}/auth/legal-status`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          ...authorizationHeaders(session),
        },
      });

      if (!response.ok) {
        return parseError(response, 'Statut des conditions générales indisponible.');
      }

      return response.json();
    },
    async acceptTerms({ session, legalAcceptance } = {}) {
      if (!hasLiveApi()) {
        throw new Error('Acceptation des conditions générales indisponible hors ligne.');
      }

      const response = await fetchFn(`${apiBaseUrl}/auth/accept-terms`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...authorizationHeaders(session),
        },
        body: JSON.stringify(legalAcceptance ?? {}),
      });

      if (!response.ok) {
        return parseError(response, 'Acceptation des conditions générales impossible.');
      }

      return response.json();
    },
    requestOtp({ phoneNumber }) {
      const normalizedPhone = String(phoneNumber ?? '').trim();

      if (!normalizedPhone) {
        throw new Error('Numéro requis.');
      }

      if (hasLiveApi()) {
        return fetchFn(`${apiBaseUrl}/auth/request-otp`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: normalizedPhone,
          }),
        }).then(async (response) => {
          if (!response.ok) {
            return parseError(response, "Impossible d'envoyer le code OTP.");
          }

          const state = loadState();
          const challenge = await response.json();

          saveState({
            ...state,
            pendingChallenge: challenge,
          });

          return challenge;
        });
      }

      const state = loadState();
      const challenge = {
        challengeId: `otp-${Date.now()}`,
        phoneNumber: normalizedPhone,
        codeLength: 6,
        demoCode: otpCode,
      };

      saveState({
        ...state,
        pendingChallenge: challenge,
      });

      return challenge;
    },
    verifyOtp({ code, phoneNumber, legalAcceptance } = {}) {
      const state = loadState();
      const challenge = state.pendingChallenge;

      if (!challenge) {
        throw new Error('Aucun code OTP en attente.');
      }

      if (hasLiveApi()) {
        return fetchFn(`${apiBaseUrl}/auth/verify-otp`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            code: String(code ?? '').trim(),
            phoneNumber: String(phoneNumber ?? challenge.phoneNumber ?? '').trim(),
            // Only a real, explicit acceptance travels with the verification.
            ...(legalAcceptance ? { legalAcceptance } : {}),
          }),
        }).then(async (response) => {
          if (!response.ok) {
            return parseError(response, 'Code OTP invalide.');
          }

          const session = await response.json();

          saveState({
            pendingChallenge: null,
            session,
          });

          return session;
        });
      }

      if (String(code ?? '').trim() !== otpCode) {
        throw new Error('Code OTP invalide.');
      }

      const session = {
        phoneNumber: challenge.phoneNumber,
        verifiedAt: new Date().toISOString(),
        canSyncDrafts: true,
        sessionToken: `session-${Date.now()}`,
      };

      saveState({
        pendingChallenge: null,
        session,
      });

      return session;
    },
  };
}
