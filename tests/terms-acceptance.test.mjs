import assert from 'node:assert/strict';
import test from 'node:test';
import { renderTermsAcceptanceScreen, renderTermsAcceptanceFields, renderLegalLinks } from '../App/features/auth/terms-acceptance-screen.mjs';
import { renderOtpScreen } from '../App/features/auth/otp-screen.mjs';

const terms = { kind: 'terms', locale: 'fr-BE', version: '2026-09-07', hash: 'abc', url: 'https://zwibba.com/legal/fr-BE/terms/', title: 'Conditions générales' };
const documents = [terms, { kind: 'privacy', locale: 'fr-BE', url: 'https://zwibba.com/legal/fr-BE/privacy/', title: 'Confidentialité' }, { kind: 'legal-notice', locale: 'fr-BE', url: 'https://zwibba.com/legal/fr-BE/legal-notice/', title: 'Mentions légales' }];

test('terms acceptance is explicit and unchecked, privacy is an informational link', () => {
  const html = renderTermsAcceptanceFields({ legal: { required: true, terms, documents } });
  assert.match(html, /name="acceptedTerms"[^>]*required/);
  assert.doesNotMatch(html, /checked/);
  assert.equal((html.match(/type="checkbox"/g) || []).length, 1);
  assert.match(html, /Confidentialité/);
  assert.doesNotMatch(html, /consens.*confidentialité|accepte.*politique de confidentialité/i);
  assert.match(html, /2026-09-07/);
});

test('inactive drafts add no checkbox and no fake legal links', () => {
  assert.equal(renderTermsAcceptanceFields(), '');
  assert.equal(renderLegalLinks({ documents: [] }), '');
});

test('existing users get a versioned acceptance form and can continue without a session', () => {
  const html = renderTermsAcceptanceScreen({ legal: { terms, documents, needsAcceptance: true }, errorMessage: '<refus>' });
  assert.match(html, /data-form="accept-terms"/);
  assert.match(html, /data-terms-hash="abc"/);
  assert.match(html, /data-action="logout"/);
  assert.match(html, /&lt;refus&gt;/);
});

test('documents without a published URL are never linked', () => {
  assert.equal(renderLegalLinks({ documents: [{ kind: 'privacy', title: 'Confidentialité' }] }), '');
});

test('legal titles and URLs are escaped', () => {
  const html = renderLegalLinks({ documents: [{ kind: 'privacy', title: '<script>', url: 'https://zwibba.com/"onmouseover=' }] });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&quot;onmouseover=/);
});

test('an unreadable status offers a retry instead of an acceptance form', () => {
  const html = renderTermsAcceptanceScreen({ legal: null, statusErrorMessage: 'Statut indisponible' });
  assert.doesNotMatch(html, /data-form="accept-terms"|name="acceptedTerms"/);
  assert.match(html, /Statut indisponible/);
  assert.match(html, /data-action="retry-legal-status"/);
  assert.match(html, /data-action="logout"/);
});

test('the OTP form carries the exact version, hash and locale to accept', () => {
  const html = renderOtpScreen({ phoneNumber: '+32499000001', legal: { required: true, terms, documents } });
  assert.match(html, /data-form="verify-otp"[^>]*data-terms-version="2026-09-07"/);
  assert.match(html, /data-terms-hash="abc"[^>]*data-terms-locale="fr-BE"/);
  assert.match(html, /name="termsVersion" value="2026-09-07"/);
  assert.match(html, /name="termsHash" value="abc"/);
  assert.match(html, /name="termsLocale" value="fr-BE"/);
});

test('OTP copy does not claim a demo code for a real challenge', () => {
  const live = renderOtpScreen({ phoneNumber: '+32499000001', legal: { required: true, terms, documents } });
  assert.doesNotMatch(live, /123456|simulons|Railway/);
  assert.match(live, /autocomplete="one-time-code"/);
  assert.match(live, /name="acceptedTerms"/);
  const demo = renderOtpScreen({ phoneNumber: '+32499000001', demoCode: '123456' });
  assert.match(demo, /démonstration/);
  assert.match(demo, /123456/);
});

test('registration and returning accounts explicitly attest adulthood with the terms', () => {
  const legal = { required: true, terms, documents };
  for (const html of [renderOtpScreen({ legal }), renderTermsAcceptanceScreen({ legal })]) {
    assert.match(html, /Je certifie avoir 18 ans révolus/);
    assert.match(html, /name="acceptedTerms"[^>]*required/);
    assert.doesNotMatch(html, /checked|name="birthDate"/);
  }
});

test('Dutch terms use a Dutch adulthood and acceptance declaration', () => {
 const html = renderTermsAcceptanceFields({ legal: { terms: { ...terms, locale: 'nl-BE' } } });
 assert.match(html, /Ik verklaar dat ik minstens 18 jaar oud ben/);
 assert.doesNotMatch(html, /Je certifie avoir/);
});
