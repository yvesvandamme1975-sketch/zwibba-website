import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(repoRoot, 'dist');

function buildSite() {
  const result = spawnSync('node', ['scripts/build.mjs'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function readDist(relativePath) {
  return readFileSync(path.join(distDir, relativePath), 'utf8');
}

function assertOrdered(html, tokens) {
  let cursor = -1;
  for (const token of tokens) {
    const index = html.indexOf(token, cursor + 1);
    assert.ok(index > cursor, `Expected ${token} after cursor ${cursor}`);
    cursor = index;
  }
}

function assertMarkerPair(html, { slot, market, locale }) {
  assert.match(
    html,
    new RegExp(`<!--zwibba-live-listings slot="${slot}" market="${market}" locale="${locale}" start-->`),
  );
  assert.match(html, new RegExp(`<!--zwibba-live-listings slot="${slot}" end-->`));
}

test('browse pages emit live-listings markers with localized fallback content', () => {
  buildSite();

  const cd = readDist('annonces/index.html');
  assertMarkerPair(cd, { slot: 'featured', market: 'CD', locale: 'fr-CD' });
  assertMarkerPair(cd, { slot: 'grid', market: 'CD', locale: 'fr-CD' });
  assertOrdered(cd, [
    '<div class="feature-strip">',
    '<!--zwibba-live-listings slot="featured" market="CD" locale="fr-CD" start-->',
  ]);
  assertOrdered(cd, [
    '<div class="listing-grid" id="browse-results-grid">',
    '<!--zwibba-live-listings slot="grid" market="CD" locale="fr-CD" start-->',
    'data-listing-card',
    '<!--zwibba-live-listings slot="grid" end-->',
  ]);
  assert.match(cd, /<template data-live-listings-empty>[\s\S]*Aucune annonce disponible pour le moment\./);

  const frBe = readDist('be/annonces/index.html');
  assertMarkerPair(frBe, { slot: 'featured', market: 'BE', locale: 'fr-BE' });
  assertMarkerPair(frBe, { slot: 'grid', market: 'BE', locale: 'fr-BE' });
  assertOrdered(frBe, [
    '<div class="feature-strip">',
    '<!--zwibba-live-listings slot="featured" market="BE" locale="fr-BE" start-->',
  ]);
  assertOrdered(frBe, [
    '<div class="listing-grid" id="browse-results-grid">',
    '<!--zwibba-live-listings slot="grid" market="BE" locale="fr-BE" start-->',
    'data-live-listings-empty-state',
    'Soyez le premier à publier en Belgique.',
    '<!--zwibba-live-listings slot="grid" end-->',
  ]);
  assert.match(frBe, /<template data-live-listings-empty>[\s\S]*Soyez le premier à publier en Belgique\./);

  const nlBe = readDist('be/nl/annonces/index.html');
  assertMarkerPair(nlBe, { slot: 'featured', market: 'BE', locale: 'nl-BE' });
  assertMarkerPair(nlBe, { slot: 'grid', market: 'BE', locale: 'nl-BE' });
  assertOrdered(nlBe, [
    '<div class="feature-strip">',
    '<!--zwibba-live-listings slot="featured" market="BE" locale="nl-BE" start-->',
  ]);
  assertOrdered(nlBe, [
    '<div class="listing-grid" id="browse-results-grid">',
    '<!--zwibba-live-listings slot="grid" market="BE" locale="nl-BE" start-->',
    'data-live-listings-empty-state',
    'Wees de eerste om in België te publiceren.',
    '<!--zwibba-live-listings slot="grid" end-->',
  ]);
  assert.match(nlBe, /<template data-live-listings-empty>[\s\S]*Wees de eerste om in België te publiceren\./);
});
