import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReadyDraft,
  decidePublishGate,
} from '../App/features/post/post-flow-controller.mjs';
import { renderPublishGateScreen } from '../App/features/post/publish-gate-screen.mjs';
import { renderSuccessScreen } from '../App/features/post/success-screen.mjs';
import { markDraftOtpVerified } from '../App/models/listing-draft.mjs';
import { createMemoryStorage } from '../App/services/draft-storage.mjs';
import { createAuthService } from '../App/services/auth-service.mjs';

test('publish redirects unauthenticated seller into phone plus otp flow', () => {
  const authService = createAuthService({
    storage: createMemoryStorage(),
  });
  const draft = createReadyDraft();

  const gate = decidePublishGate({
    draft,
    session: authService.loadSession(),
  });

  assert.equal(gate.status, 'needs_auth');
  assert.equal(gate.nextRoute, '#auth-welcome');
});

test('authenticated publish continues without interruption', () => {
  const authService = createAuthService({
    storage: createMemoryStorage(),
  });
  const draft = createReadyDraft();

  authService.requestOtp({
    phoneNumber: '+243990000001',
  });

  const session = authService.verifyOtp({
    code: '123456',
  });

  const syncedDraft = markDraftOtpVerified(draft, {
    phoneNumber: session.phoneNumber,
  });
  const gate = decidePublishGate({
    draft: syncedDraft,
    session,
  });

  assert.equal(gate.status, 'ready_for_submission');
  assert.equal(gate.nextRoute, '#publish');
});

test('otp verify returns a session usable for draft sync', () => {
  const authService = createAuthService({
    storage: createMemoryStorage(),
  });

  authService.requestOtp({
    phoneNumber: '+243990000001',
  });

  const session = authService.verifyOtp({
    code: '123456',
  });

  assert.equal(session.phoneNumber, '+243990000001');
  assert.equal(session.canSyncDrafts, true);
  assert.equal(authService.loadSession().phoneNumber, '+243990000001');
});

test('verified publish gate shows a final publish CTA', () => {
  const html = renderPublishGateScreen({
    draft: createReadyDraft(),
    session: {
      phoneNumber: '+243990000001',
      canSyncDrafts: true,
    },
  });

  assert.match(html, /Publier maintenant/);
});

test('success screen exposes the post-publish sharing actions', () => {
  const html = renderSuccessScreen({
    draft: createReadyDraft({
      title: 'Samsung Galaxy A54 128 Go',
    }),
    listingUrl: '/annonce/samsung-galaxy-a54-128-go',
  });

  assert.match(html, /Partager sur WhatsApp/);
  assert.match(html, /Copier le lien/);
  assert.match(html, /Voir mon annonce/);
});
