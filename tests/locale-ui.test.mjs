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

test('fr-cd ui.browse.conditions is a list of {code, label} with ascii-stable codes', () => {
  assert.ok(Array.isArray(ui.browse.conditions));
  assert.deepEqual(ui.browse.conditions, [
    { code: 'neuf', label: 'Neuf' },
    { code: 'bon-etat', label: 'Bon état' },
    { code: 'tres-bon-etat', label: 'Très bon état' },
    { code: 'service', label: 'Service' },
    { code: 'frais', label: 'Frais' },
  ]);
  assert.equal(ui.browse.hero.eyebrow, 'Petites annonces');
  assert.equal(ui.browse.filters.searchPlaceholder, 'Ex: Galaxy, terrain, plomberie...');
});

test('fr-cd ui.listing exposes buyer contact action labels', () => {
  assert.equal(ui.listing.call, 'Appeler');
  assert.equal(ui.listing.whatsapp, 'WhatsApp');
  assert.equal(ui.listing.sms, 'SMS');
  assert.equal(ui.listing.share, 'Partager');
  assert.equal(ui.listing.viewInApp, "Voir dans l'application");
  assert.equal(ui.listing.copyLink, 'Copier le lien');
});

test('fr-cd ui.safetyTips exposes the five safety tips', () => {
  assert.ok(Array.isArray(ui.safetyTips));
  assert.equal(ui.safetyTips.length, 5);
});

test('fr-cd ui.contact exposes hero, form, and whatsapp block copy', () => {
  assert.equal(ui.contact.pageTitle, 'Contact Zwibba');
  assert.equal(ui.contact.form.submit, 'Envoyer par e-mail');
  assert.equal(ui.contact.whatsapp.cd, 'RDC');
  assert.equal(ui.contact.whatsapp.be, 'Belgique');
});

test('build output uses stable condition codes for the browse filter select', async () => {
  const { execFileSync } = await import('node:child_process');
  const { readFileSync } = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  execFileSync('node', ['scripts/build.mjs'], { cwd: repoRoot, stdio: 'pipe' });

  const distPath = path.join(repoRoot, 'dist', 'annonces', 'index.html');
  const html = readFileSync(distPath, 'utf8');
  assert.match(html, /value="tres-bon-etat"/);
});
