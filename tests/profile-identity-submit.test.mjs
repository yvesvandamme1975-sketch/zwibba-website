import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { resolveDisplayNameForSubmit } from '../App/utils/profile-identity-submit.mjs';
import { renderProfileScreen } from '../App/features/profile/profile-screen.mjs';

const APP_JS_URL = new URL('../App/app.js', import.meta.url);

test('display name submit trims and accepts a valid name', () => {
  const result = resolveDisplayNameForSubmit({ displayName: '  Boutique Katanga  ' });

  assert.deepEqual(result, { ok: true, value: 'Boutique Katanga' });
});

test('display name submit rejects an empty name', () => {
  const result = resolveDisplayNameForSubmit({ displayName: '   ' });

  assert.equal(result.ok, false);
  assert.match(result.error, /nom/i);
});

test('display name submit rejects a name over 40 characters', () => {
  const result = resolveDisplayNameForSubmit({ displayName: 'x'.repeat(41) });

  assert.equal(result.ok, false);
  assert.match(result.error, /40/);
});

test('app wires the profile-identity form to the identity submit handler', async () => {
  const source = await readFile(APP_JS_URL, 'utf8');

  assert.match(source, /dataset\.form\s*===\s*'profile-identity'/);
  assert.match(source, /handleIdentitySubmit/);
  assert.match(source, /profileService\.saveIdentity\(/);
});

test('profile screen renders identity feedback near the name form', () => {
  const base = {
    session: { phoneNumber: '+243990000001' },
    state: 'ready',
  };

  const withMessage = renderProfileScreen({
    ...base,
    identityMessage: 'Boutique Katanga.',
  });

  assert.match(withMessage, /data-profile-identity-message/);
  assert.match(withMessage, /Nom enregistré/);

  const withError = renderProfileScreen({
    ...base,
    identityError: 'Choisissez un nom vendeur.',
  });

  assert.match(withError, /data-profile-identity-error/);
  assert.match(withError, /Choisissez un nom vendeur\./);
});
