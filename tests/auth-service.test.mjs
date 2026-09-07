import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthService } from '../App/services/auth-service.mjs';

function setup(responses) {
  const storageMap = new Map();
  const calls = [];
  const service = createAuthService({ storage: { getItem: key => storageMap.get(key), setItem: (key, value) => storageMap.set(key, value) }, apiBaseUrl: 'https://api.example', fetchFn: async (url, options) => { calls.push({ url, options }); return responses.shift(); } });
  return { service, calls };
}

test('OTP request keeps legal version and verification sends explicit acceptance', async () => {
  const legalAcceptance = { accepted: true, version: 'v1', hash: 'hash1', locale: 'fr-BE' };
  const { service, calls } = setup([Response.json({ phoneNumber: '+32499000001', legal: { required: true, terms: legalAcceptance } }), Response.json({ sessionToken: 's1' })]);
  await service.requestOtp({ phoneNumber: '+32499000001' });
  assert.equal(service.getPendingChallenge().legal.required, true);
  await service.verifyOtp({ code: '123456', legalAcceptance });
  assert.deepEqual(JSON.parse(calls[1].options.body).legalAcceptance, legalAcceptance);
});

test('verification sends no acceptance when the box was not ticked', async () => {
  const { service, calls } = setup([Response.json({ phoneNumber: '+243990000001' }), Response.json({ sessionToken: 's2' })]);
  await service.requestOtp({ phoneNumber: '+243990000001' });
  await service.verifyOtp({ code: '123456' });
  assert.equal(Object.hasOwn(JSON.parse(calls[1].options.body), 'legalAcceptance'), false);
});

test('a stale version reloads the published catalog without asking for a new code', async () => {
  const beTerms = { kind: 'terms', market: 'BE', locale: 'fr-BE', version: 'v2', hash: 'h2', url: 'https://zwibba.com/legal/fr-BE/terms/', title: 'Conditions générales' };
  const { service, calls } = setup([
    Response.json({ phoneNumber: '+32499000001', legal: { required: true, terms: { ...beTerms, version: 'v1', hash: 'h1' } } }),
    Response.json({ active: true, documents: [beTerms, { ...beTerms, kind: 'privacy', locale: 'nl-BE', title: 'Privacyverklaring' }, { ...beTerms, market: 'CD', locale: 'fr-CD' }] }),
  ]);
  await service.requestOtp({ phoneNumber: '+32499000001' });
  const challenge = await service.refreshPendingChallengeLegal();
  assert.deepEqual(calls.map(call => call.url), ['https://api.example/auth/request-otp', 'https://api.example/auth/legal-documents']);
  assert.equal(challenge.legal.terms.hash, 'h2');
  assert.equal(service.getPendingChallenge().legal.terms.version, 'v2');
  assert.deepEqual(challenge.legal.documents.map(document => document.locale), ['fr-BE']);
});

test('an unreadable legal status is reported instead of assumed inactive', async () => {
  const { service } = setup([Response.json({ message: 'Service indisponible' }, { status: 503 })]);
  await assert.rejects(
    () => service.getLegalStatus({ sessionToken: 's1' }),
    error => error.message === 'Service indisponible' && error.status === 503,
  );
});

test('legal status and acceptance use the existing session and report server status', async () => {
  const { service, calls } = setup([Response.json({ needsAcceptance: true }), Response.json({ message: 'Version périmée', code: 'TERMS_STALE' }, { status: 409 })]);
  const session = { sessionToken: 'existing' };
  assert.equal((await service.getLegalStatus(session)).needsAcceptance, true);
  assert.equal(calls[0].options.headers.authorization, 'Bearer existing');
  await assert.rejects(() => service.acceptTerms({ session, legalAcceptance: { accepted: true, version: 'old' } }), error => error.message === 'Version périmée' && error.status === 409);
  assert.deepEqual(JSON.parse(calls[1].options.body), { accepted: true, version: 'old' });
});
