import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { site as frCdSite } from '../src/site/locales/fr-cd.mjs';
import { site as frBeSite } from '../src/site/locales/fr-be.mjs';
import { site as nlBeSite } from '../src/site/locales/nl-be.mjs';

test('les stores sont indisponibles dans les trois locales', () => {
  for (const currentSite of [frCdSite, frBeSite, nlBeSite]) {
    assert.ok(currentSite.stores.every((store) => store.available === false));
  }
});

test('aucun lien Play Store ou AppGallery mort dans les pages construites', () => {
  execSync('node scripts/build.mjs', { stdio: 'ignore' });

  for (const file of ['index.html', 'be/index.html', 'be/nl/index.html']) {
    const html = readFileSync(`dist/${file}`, 'utf8');

    assert.doesNotMatch(html, /<a[^>]*play\.google\.com/);
    assert.doesNotMatch(html, /<a[^>]*appgallery\.huawei\.com/);
    assert.match(html, /<span class="store-button[^>]*aria-disabled="true"[^>]*data-store-link/);
    assert.match(html, /Bientôt disponible|Binnenkort beschikbaar/);
  }
});

test("la nav ne contient plus Explorer et conserve les vrais CTA", () => {
  const cd = readFileSync('dist/index.html', 'utf8');
  assert.doesNotMatch(cd, />Explorer</);
  assert.match(cd, /href="\/App\/"/);
  assert.match(cd, /href="\/ambassadeur\/">Programme ambassadeur<\/a>/);

  const nlBe = readFileSync('dist/be/nl/index.html', 'utf8');
  assert.doesNotMatch(nlBe, />Ontdekken</);
  assert.match(nlBe, /href="\/App\/\?country=BE"/);
  assert.match(nlBe, /href="\/be\/nl\/ambassadeur\/">Ambassadeursprogramma<\/a>/);
});
