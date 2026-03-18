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

  async function parseError(response, fallbackMessage) {
    try {
      const json = await response.json();
      const message = json?.message;

      if (typeof message === 'string' && message.trim()) {
        throw new Error(message);
      }
    } catch (error) {
      if (error instanceof Error && error.message !== fallbackMessage) {
        throw error;
      }
    }

    throw new Error(fallbackMessage);
  }

  function hasLiveApi() {
    return Boolean(apiBaseUrl && typeof fetchFn === 'function');
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
    verifyOtp({ code, phoneNumber } = {}) {
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
