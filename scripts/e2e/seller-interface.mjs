import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright';
import { createListingDraftFromFirstPhoto, serializeListingDraft } from '../../App/models/listing-draft.mjs';

const baseUrl = process.env.ZWIBBA_E2E_BASE_URL || 'http://127.0.0.1:4342';
const output = process.env.UI_TEST_OUTPUT_DIR || '/tmp/zwibba-seller-qa';
mkdirSync(output, { recursive: true });
const results = [];
const image = '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.jpg';
const detail = {
  id: 'owner', slug: 'owner', title: 'Mon vélo', summary: 'Vélo en bon état.', categoryId: 'sports_leisure',
  countryCode: 'BE', priceAmount: 120, priceCurrency: 'EUR', locationLabel: 'Bruxelles',
  primaryImageUrl: image, images: [image], viewerRole: 'owner', contactActions: [], safetyTips: [],
  seller: { name: 'Compte de recette', sellerId: 'fixture' }, lifecycleStatus: 'active', lifecycleStatusLabel: 'Active',
  editDraft: { draftId: 'draft', title: 'Mon vélo', description: 'Vélo en bon état.', categoryId: 'sports_leisure',
    priceAmount: 120, priceCurrency: 'EUR', area: 'Bruxelles', condition: 'good',
    photos: [{ photoId: 'photo', publicUrl: image, sourcePresetId: 'capture' }] },
  canPause: true, canMarkSold: true, canDelete: true,
};
for (const [engineName, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await engine.launch();
  try {
    for (const width of [320, 360, 390, 412, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: true,
        isMobile: width < 600, serviceWorkers: 'block', reducedMotion: 'reduce' });
      const errors = [], countries = [];
      let current = { ...detail }, pendingLifecycle, finishLifecycle, lifecycleCalls = 0;
      page.on('pageerror', error => errors.push(error.message));
      page.on('dialog', dialog => dialog.accept());
      await page.addInitScript(() => {
        Object.defineProperty(window, 'ZWIBBA_API_BASE_URL', { get: () => location.origin + '/api-fixture', set: () => {} });
        if (!sessionStorage.getItem('fixture-initialized')) {
          localStorage.setItem('zwibba_app_auth', JSON.stringify({ session: { sessionToken: 'fixture-only', phoneNumber: '+32470000001' }, pendingChallenge: null }));
          sessionStorage.setItem('fixture-initialized', 'yes');
        }
      });
      await page.route('**/api-fixture/**', async route => {
        const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api-fixture', '');
        if (path === '/listings/owner/lifecycle' && request.method() === 'POST') {
          lifecycleCalls++;
          assert.deepEqual(request.postDataJSON(), { action: 'pause', reasonCode: '' });
          await pendingLifecycle;
          if (lifecycleCalls === 1) return route.fulfill({ status: 503, json: { message: 'Connexion indisponible. Réessayez.' } });
          current = { ...detail, canPause: false, canResume: true, canMarkSold: false, lifecycleStatus: 'paused', lifecycleStatusLabel: 'En pause' };
          return route.fulfill({ json: current });
        }
        assert.equal(request.method(), 'GET', 'All business writes are explicitly intercepted');
        let json = { items: [] };
        if (path === '/listings') {
          const country = url.searchParams.get('countryCode'); countries.push(country);
          json = { items: [{ ...detail, id: 'market', slug: 'market', title: 'Marché ' + country,
            countryCode: country, priceCurrency: country === 'BE' ? 'EUR' : 'CDF' }] };
        } else if (path === '/listings/owner') json = current;
        else if (path === '/listings/mine') json = { items: [current] };
        else if (path === '/wallet') json = { balanceCdf: 0, transactions: [] };
        else if (path === '/profile') json = { id: 'fixture', displayName: 'Compte de recette', area: 'Bruxelles', phoneNumber: '+32470000001' };
        else if (path.startsWith('/auth/legal')) json = { active: false, needsAcceptance: false, documents: [] };
        await route.fulfill({ json });
      });
      await page.goto(baseUrl + '/App/#sell');
      await page.locator('[data-market-toggle]').waitFor();
      const logo = page.locator('.app-brand-mark__icon');
      const expectedWidth = Math.min(160, width * .47);
      const checkLogo = async () => {
        const rect = await logo.boundingBox(); assert.ok(Math.abs(rect.width - expectedWidth) < .1);
        assert.equal(rect.height, 60); assert.equal(await logo.evaluate(el => getComputedStyle(el).objectFit), 'cover');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const country = await page.locator('.app-topbar__country').boundingBox();
        assert.ok(country.x >= rect.x + rect.width || country.y >= rect.y + rect.height, 'Logo never overlaps country');
      };
      await checkLogo();
      await page.screenshot({ path: `${output}/seller-home-${engineName}-${width}.png` });
      for (const market of ['BE', 'CD']) {
        await page.locator('[data-market-toggle]').tap();
        const option = page.locator(`[data-action="set-browse-country"][data-country="${market}"]`);
        assert.equal(await option.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)); }), true);
        await option.tap();
        await page.getByText('Marché ' + market, { exact: true }).first().waitFor();
        assert.ok(countries.includes(market));
        const card = page.locator('.app-home__listing-card').first();
        assert.match(await card.innerText(), market === 'BE' ? /EUR|€/ : /CDF|FC/);
        assert.equal(await page.evaluate(() => localStorage.getItem('zwibba_app_country')), market);
        await page.locator('[data-tab-id="buy"]').tap();
        assert.equal((await page.locator('[data-market-toggle]').innerText()).trim(), market === 'BE' ? 'Belgique' : 'RDC');
        await checkLogo();
        await page.reload();
        await page.getByText('Marché ' + market, { exact: true }).first().waitFor();
        assert.equal((await page.locator('[data-market-toggle]').innerText()).trim(), market === 'BE' ? 'Belgique' : 'RDC');
      }
      // Seller identity is still BE even after choosing CD to browse.
      await page.goto(baseUrl + '/App/#listing/owner');
      await page.locator('.app-detail__owner-dock').waitFor();
      await checkLogo();
      assert.equal(await page.locator('.app-tab-shell__nav [aria-current="page"]').getAttribute('href'), '#profile');
      assert.equal(await page.getByRole('button', { name: 'Envoyer un message', exact: true }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Modifier', exact: true }).count(), 1);
      const content = page.locator('.app-tab-shell__content'), dock = page.locator('.app-detail__owner-dock'), nav = page.locator('.app-tab-shell__nav');
      for (const zoom of ['', '200%']) {
        await page.evaluate(size => document.documentElement.style.fontSize = size, zoom);
        const [c,d,n] = await Promise.all([content.boundingBox(), dock.boundingBox(), nav.boundingBox()]);
        assert.ok(c.y+c.height <= d.y+1 && d.y+d.height <= n.y+1 && n.y+n.height <= 845);
        assert.ok(c.height > 250);
      }
      await page.evaluate(() => document.documentElement.style.fontSize = '');
      await page.screenshot({ path: `${output}/seller-owner-${engineName}-${width}.png` });
      for (let attempt = 1; attempt <= 2; attempt++) {
        pendingLifecycle = new Promise(resolve => { finishLifecycle = resolve; });
        await page.getByRole('button', { name: 'Mettre en pause', exact: true }).tap();
        await page.waitForFunction(() => document.querySelector('.app-detail__owner-dock fieldset')?.disabled);
        assert.equal(await page.getByRole('button', { name: 'Modifier', exact: true }).isDisabled(), true);
        assert.equal(await page.getByRole('button', { name: 'Supprimer l’annonce', exact: true }).isDisabled(), true);
        finishLifecycle();
        if (attempt === 1) await dock.getByRole('status').filter({ hasText: 'Connexion indisponible' }).waitFor();
        else await page.getByRole('button', { name: 'Remettre en ligne', exact: true }).waitFor();
      }
      assert.equal(lifecycleCalls, 2);
      await page.getByRole('button', { name: 'Modifier', exact: true }).tap();
      await page.waitForURL(url => url.hash === '#review');
      assert.equal(await page.locator('input[name="title"]').inputValue(), 'Mon vélo');
      assert.equal(await page.locator('select[name="priceCurrency"]').inputValue(), 'EUR');
      await checkLogo();
      await page.locator('[data-tab-id="sell"]').tap();
      await page.getByRole('link', { name: 'Continuer mon brouillon', exact: true }).waitFor();
      await page.getByRole('link', { name: 'Mes annonces', exact: true }).tap();
      await page.waitForURL(url => url.hash === '#profile'); await checkLogo();
      // A fresh draft has no inherited currency from an existing listing.
      const freshDraft = serializeListingDraft(createListingDraftFromFirstPhoto({ photoUrl: image }));
      await page.evaluate(draft => localStorage.setItem('zwibba_app_draft', draft), freshDraft);
      await page.goto(baseUrl + '/App/#review');
      await page.locator('select[name="priceCurrency"]').waitFor();
      assert.equal(await page.locator('select[name="priceCurrency"]').inputValue(), 'EUR');
      assert.equal((await page.locator('.app-topbar__country').innerText()).trim(), 'Belgique');
      await page.goto(baseUrl + '/App/#wallet');
      await page.locator('.app-topbar__country').waitFor();
      assert.equal((await page.locator('.app-topbar__country').innerText()).trim(), 'Belgique');
      assert.deepEqual(errors, []);
      results.push({ engine: engineName, width, touch: true, countrySelection: true, countryPersistence: true,
        ownerActions: true, busyErrorSuccess: true, editDraftPreserved: true, logoWidth: expectedWidth, physicalDevice: false });
      await page.close();
      console.log(`PASS ${engineName} ${width}: country, persistence, owner dock, lifecycle, edit, logo`);
    }
  } finally { await browser.close(); }
}
writeFileSync(`${output}/seller-interface-checks.json`, JSON.stringify(results, null, 2));
