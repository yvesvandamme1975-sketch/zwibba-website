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
    verifyOtp({ code }) {
      const state = loadState();
      const challenge = state.pendingChallenge;

      if (!challenge) {
        throw new Error('Aucun code OTP en attente.');
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
