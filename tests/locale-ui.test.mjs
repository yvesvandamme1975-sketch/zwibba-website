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

test('fr-cd ui.nav.localeSwitch exposes the footer locale switcher heading and options', () => {
  assert.equal(ui.nav.localeSwitch.heading, 'Version');
  assert.deepEqual(ui.nav.localeSwitch.options, [
    { code: 'fr-CD', label: 'RDC (FR)' },
    { code: 'fr-BE', label: 'Belgique (FR)' },
    { code: 'nl-BE', label: 'België (NL)' },
  ]);
});

test('fr-cd ui.client.geoBanner exposes the belgian geo suggestion banner copy', () => {
  assert.equal(ui.client.geoBanner.text, 'Zwibba existe aussi en Belgique.');
  assert.equal(ui.client.geoBanner.cta, 'Découvrir Zwibba Belgique');
  assert.equal(ui.client.geoBanner.dismiss, 'Non merci');
});

test('fr-cd ui.client exposes browser-side strings for app.js with lang for plural rules', () => {
  assert.equal(ui.client.lang, 'fr');
  assert.equal(ui.client.menu.opened, 'Menu ouvert');
  assert.equal(ui.client.menu.closed, 'Menu fermé');
  assert.equal(ui.client.copyLink.toastLabel, 'Lien copié');
  assert.equal(ui.client.copyLink.announce, 'Lien copié dans le presse-papiers');
  assert.equal(ui.client.copyLink.prompt, 'Copiez ce lien');
  assert.equal(ui.client.referral.toastLabel, 'Lien ambassadeur copié');
  assert.equal(ui.client.referral.announce, 'Lien ambassadeur copié');
  assert.equal(ui.client.mailto.nameLabel, 'Nom');
  assert.equal(ui.client.mailto.emailLabel, 'Email');
  assert.equal(ui.client.results.one, '{count} annonce visible');
  assert.equal(ui.client.results.other, '{count} annonces visibles');
});

test('build output injects window.ZWIBBA_UI_STRINGS with ui.client on the landing page', async () => {
  const { execFileSync } = await import('node:child_process');
  const { readFileSync } = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  execFileSync('node', ['scripts/build.mjs'], { cwd: repoRoot, stdio: 'pipe' });

  const landing = readFileSync(path.join(repoRoot, 'dist', 'index.html'), 'utf8');
  assert.match(landing, /window\.ZWIBBA_UI_STRINGS\s*=/);
  assert.match(landing, /Lien copié/);
});

test('build output keeps fr-CD lang and price formatting unchanged on the browse page', async () => {
  const { readFileSync } = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  const browse = readFileSync(path.join(repoRoot, 'dist', 'annonces', 'index.html'), 'utf8');
  assert.match(browse, /<html lang="fr">/);
  assert.match(browse, /450\s?000 CDF/);
});

test('build output keeps priceCurrency CDF in JSON-LD schemas', async () => {
  const { readFileSync } = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

  const landing = readFileSync(path.join(repoRoot, 'dist', 'index.html'), 'utf8');
  assert.match(landing, /"priceCurrency":"CDF"/);

  const listing = readFileSync(
    path.join(repoRoot, 'dist', 'annonce', 'samsung-galaxy-a54-neuf-lubumbashi', 'index.html'),
    'utf8',
  );
  assert.match(listing, /"priceCurrency":"CDF"/);
});
