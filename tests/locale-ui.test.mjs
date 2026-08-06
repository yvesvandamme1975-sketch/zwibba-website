import test from 'node:test';
import assert from 'node:assert/strict';

import { ui } from '../src/site/locales/fr-cd.mjs';

test('fr-cd ui.nav exposes layout and nav chrome strings', () => {
  assert.equal(ui.nav.explore, 'Explorer');
  assert.equal(ui.nav.download, 'Télécharger');
  assert.equal(ui.nav.skipLink, 'Aller au contenu');
});

test('fr-cd ui.gate exposes the download-gate dialog strings', () => {
  assert.equal(ui.gate.title, 'Ouvrez Zwibba pour continuer');
  assert.equal(ui.gate.closeLabel, 'Fermer');
});

test('fr-cd ui.landing exposes the landing page hero copy', () => {
  assert.equal(
    ui.landing.heroTitle,
    'La place de marché qui transforme une photo en annonce prête à publier.',
  );
});

test('fr-cd ui.referral exposes the redirect page copy', () => {
  assert.equal(ui.referral.title, 'Transmission du code en cours…');
});

test('fr-cd ui.ambassador exposes the page title and "how it works" step cards', () => {
  assert.equal(ui.ambassador.pageTitle, 'Programme ambassadeur Zwibba');
  assert.equal(ui.ambassador.steps.items[0].title, 'Créez un compte vendeur');
});

test('fr-cd ui.about exposes the context note cards', () => {
  assert.equal(ui.about.context.notes[0].title, 'IA utile');
});
