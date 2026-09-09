import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { chromium, webkit } from 'playwright';

const baseUrl = process.env.UI_TEST_BASE_URL || 'http://127.0.0.1:4340';
const outputDir = process.env.UI_TEST_OUTPUT_DIR || '/tmp/zwibba-topbar-qa';
const widths = (process.env.UI_TEST_WIDTHS || '320,390,768,1024,1440').split(',').map(Number);
mkdirSync(outputDir, { recursive: true });
const imageUrl = `${baseUrl}/assets/listings/be-velo-cargo-electrique-bruxelles.jpg`;
const listing = {
  id: 'fixture', slug: 'fixture', title: 'Velo cargo', categoryId: 'vehicles',
  categoryLabel: 'Vehicules', locationLabel: 'Bruxelles', priceAmount: 120,
  priceCurrency: 'EUR', priceCdf: 120, countryCode: 'BE',
  primaryImageUrl: imageUrl, images: [imageUrl], summary: 'Annonce de recette locale.',
  seller: { sellerId: 'fixture', name: 'Vendeur test', ratingCount: 0 },
  contactActions: ['message'], viewerRole: 'buyer', safetyTips: [],
};

async function createPage(browser, width, authenticated = false) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ authenticated }) => {
    Object.defineProperty(window, 'ZWIBBA_API_BASE_URL', {
      get: () => `${location.origin}/api-fixture`, set: () => {},
    });
    localStorage.setItem('zwibba_app_country', authenticated ? 'CD' : 'BE');
    if (authenticated) {
      localStorage.setItem('zwibba_app_auth', JSON.stringify({
        session: { sessionToken: 'fixture-only', phoneNumber: '+32499000001' },
        pendingChallenge: null,
      }));
    }
  }, { authenticated });
  const state = { failDetail: false, empty: false, holdFeed: null, holdDetail: null, countries: [], requests: {} };
  await page.route('**/api-fixture/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api-fixture', '');
    state.requests[path] = (state.requests[path] || 0) + 1;
    assert.equal(route.request().method(), 'GET', `Unexpected write to fixture ${path}`);
    let json = { items: [] };
    if (path.startsWith('/auth/legal')) json = { active: false, needsAcceptance: false, documents: [] };
    else if (path === '/listings') {
      state.countries.push(url.searchParams.get('countryCode'));
      if (state.holdFeed) await state.holdFeed;
      json = { items: state.empty ? [] : [listing] };
    } else if (path === '/listings/fixture') {
      if (state.holdDetail) await state.holdDetail;
      if (state.failDetail) return route.fulfill({ status: 503, json: { message: 'Indisponible' } });
      json = listing;
    } else if (path === '/sellers/fixture') {
      if (state.failDetail) return route.fulfill({ status: 503, json: { message: 'Indisponible' } });
      json = { seller: { id: 'fixture', displayName: 'Vendeur test', area: 'Bruxelles' }, listings: [listing], reviews: [] };
    } else if (path === '/profile') {
      json = { id: 'fixture', displayName: 'Profil test', area: 'Bruxelles', phoneNumber: '+32499000001' };
    } else if (path === '/wallet') json = { balanceCdf: 0, transactions: [] };
    else if (path === '/chat/threads/fixture') {
      if (state.failDetail) return route.fulfill({ status: 503, json: { message: 'Indisponible' } });
      json = { id: 'fixture', listingTitle: listing.title, participantName: 'Vendeur test', messages: [] };
    }
    return route.fulfill({ json });
  });
  return { page, state, errors };
}

async function visit(page, route, search = '') {
  await page.goto(`${baseUrl}/App/${search}#${route}`);
  await page.waitForFunction(expected => document.querySelector('[data-app-root]')?.dataset.screen === expected, route.split('/')[0]);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.app-topbar').waitFor();
}

async function geometry(page, width, { zoom = false } = {}) {
  await page.locator('.app-brand-mark__icon').waitFor({ state: 'visible' });
  assert.equal(await page.locator('.app-topbar').count(), 1);
  // Resolve and measure in one browser task, never a handle detached by a render.
  const measurement = await page.evaluate(() => {
    const topbar = document.querySelector('.app-topbar');
    const brand = topbar.querySelector('.app-brand-mark');
    const country = topbar.querySelector('.app-topbar__country');
    const logo = brand.querySelector('img');
    const back = document.querySelector('.app-flow__back');
    const rect = element => element ? JSON.parse(JSON.stringify(element.getBoundingClientRect())) : null;
    return {
      topbar: rect(topbar), brand: rect(brand), country: rect(country), back: rect(back),
      fontSize: parseFloat(getComputedStyle(brand.querySelector('strong')).fontSize),
      logoLoaded: logo.complete && logo.naturalWidth > 0, logo: rect(logo),
      wordmark: brand.querySelector('strong').textContent,
      noTranslate: brand.querySelector('strong').getAttribute('translate'),
      countryText: country?.textContent.trim(), text: topbar.textContent,
    };
  });
  const { topbar, brand, country, back, logo } = measurement;
  assert.equal(measurement.wordmark, 'Zwibba');
  assert.equal(measurement.noTranslate, 'no');
  assert.equal(measurement.logoLoaded, true);
  assert.equal(logo.width, 32, JSON.stringify(measurement));
  assert.equal(logo.height, 32);
  assert.equal(measurement.fontSize, (width >= 920 ? 28 : 24) * (zoom ? 2 : 1));
  assert.doesNotMatch(measurement.text, /BETA|Vendez en un clic/);
  assert.ok(topbar.height >= 64);
  assert.ok(topbar.left >= 0 && topbar.right <= width + 1, 'Topbar inside viewport');
  for (const rect of [brand, country].filter(Boolean)) {
    assert.ok(rect.left >= topbar.left - 1 && rect.right <= topbar.right + 1, 'Children fit horizontally');
    assert.ok(rect.top >= topbar.top - 1 && rect.bottom <= topbar.bottom + 1, 'Children fit vertically');
  }
  if (country) {
    assert.ok(country.height >= 44, 'Country target/context at least 44px');
    assert.ok(country.left >= brand.right || country.top >= brand.bottom, 'No country/brand overlap');
  }
  if (back) assert.ok(back.top >= topbar.bottom - 1, 'Return follows the brand row');
  return measurement;
}

async function menuChecks(page, state, engineName) {
  const menu = page.locator('[data-market-menu]');
  const toggle = page.locator('[data-market-toggle]');
  const isToggleFocused = () => page.evaluate(() => document.activeElement === document.querySelector('[data-market-toggle]'));
  await toggle.focus();
  await page.keyboard.press('Enter');
  assert.equal(await menu.getAttribute('open'), '');
  await page.keyboard.press('Escape');
  assert.equal(await menu.getAttribute('open'), null);
  assert.equal(await isToggleFocused(), true);
  await toggle.click();
  await page.locator('input[type="search"]').click({ position: { x: 12, y: 12 } });
  assert.equal(await menu.getAttribute('open'), null);
  await toggle.focus();
  await page.keyboard.press('Enter');
  // macOS WebKit uses Option-Tab to include non-text form controls.
  await page.keyboard.press(engineName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.country), 'CD');
  const focusedStyle = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  assert.notEqual(focusedStyle.style, 'none');
  assert.ok(focusedStyle.width >= 2);
  await page.keyboard.press('Enter');
  await page.waitForLoadState('networkidle');
  assert.equal((await toggle.textContent()).trim(), 'RDC');
  assert.equal(await menu.getAttribute('open'), null);
  assert.equal(await isToggleFocused(), true);
  assert.ok(state.countries.includes('CD'));
  assert.equal(await page.evaluate(() => localStorage.getItem('zwibba_app_country')), 'CD');

  let release;
  state.holdFeed = new Promise(resolve => { release = resolve; });
  const refreshedFeed = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === '/api-fixture/listings' && url.searchParams.get('countryCode') === 'BE';
  });
  await toggle.click();
  await page.locator('[data-action="set-browse-country"][data-country="BE"]').click();
  await toggle.click();
  await page.locator('[data-action="set-browse-country"][data-country="BE"]').focus();
  release();
  state.holdFeed = null;
  await refreshedFeed;
  await page.waitForLoadState('networkidle');
  assert.equal(await menu.getAttribute('open'), '');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.country), 'BE');
  await page.keyboard.press('Escape');
  assert.equal(await isToggleFocused(), true);
}

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  if (process.env.UI_TEST_ENGINE && process.env.UI_TEST_ENGINE !== name) continue;
  const browser = await engine.launch();
  try {
    for (const width of widths) {
      const { page, state, errors } = await createPage(browser, width);
      for (const route of ['sell', 'buy', 'messages', 'wallet', 'profile', 'listing/fixture', 'seller/fixture', 'capture', 'phone', 'auth-welcome']) {
        await visit(page, route);
        const box = await geometry(page, width);
        assert.equal(box.countryText, 'Belgique');
        if (route === 'buy') {
          assert.equal(await page.locator('[data-market-toggle]').count(), 1);
          assert.equal(await page.getByText('Prendre une photo', { exact: true }).count(), 0);
          const chips = page.locator('[data-category-id]');
          const before = await chips.first().boundingBox();
          await chips.nth(1).click();
          const after = await chips.first().boundingBox();
          assert.equal(after.height, before.height, 'Category height stable when empty');
          await chips.first().click();
          await menuChecks(page, state, name);
        } else assert.equal(await page.locator('[data-market-toggle]').count(), 0);
        if ([390, 1440].includes(width) && ['sell', 'buy', 'listing/fixture'].includes(route)) {
          await page.waitForFunction(() => [...document.querySelectorAll('.app-home img, .app-flow img')]
            .filter(img => img.getBoundingClientRect().top < innerHeight)
            .every(img => img.complete && img.naturalWidth > 0));
          await page.screenshot({ path: `${outputDir}/${name}-${width}-${route.replace('/', '-')}.png` });
        }
        console.log(`PASS ${name} ${width} guest #${route}: topbar=${box.topbar.height}px wordmark=${box.fontSize}px`);
      }
      await visit(page, 'buy');
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await geometry(page, width, { zoom: true });
      await page.locator('[data-market-toggle]').click();
      for (const option of await page.locator('[data-action="set-browse-country"]').all()) {
        const box = await option.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= width + 1, 'Menu fits at 200% text size');
      }
      if (width === 320) await page.screenshot({ path: `${outputDir}/${name}-320-text-200.png` });
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
      state.empty = true;
      await visit(page, 'buy', '?qa=empty');
      assert.equal(await page.locator('.app-home__listing-card').count(), 0);
      await page.getByText('Aucune annonce ne correspond', { exact: false }).waitFor();
      assert.equal((await geometry(page, width)).topbar.height, 64, 'Empty feed keeps header height');
      state.failDetail = true;
      for (const [route, path] of [['listing/fixture', '/listings/fixture'], ['seller/fixture', '/sellers/fixture']]) {
        const before = state.requests[path] || 0;
        await visit(page, route, `?qa=error-${encodeURIComponent(route)}`);
        await geometry(page, width);
        assert.equal(state.requests[path], before + 1, 'Error does not re-fetch in a render loop');
        await page.locator('.app-flow__back').click();
        await page.waitForURL(url => url.hash === '#buy');
      }
      state.failDetail = false;
      let releaseDetail;
      state.holdDetail = new Promise(resolve => { releaseDetail = resolve; });
      await page.goto(`${baseUrl}/App/#listing/fixture`);
      await page.getByText('Chargement', { exact: false }).first().waitFor();
      const loadingBox = await geometry(page, width);
      releaseDetail();
      state.holdDetail = null;
      await page.waitForLoadState('networkidle');
      assert.equal((await geometry(page, width)).topbar.height, loadingBox.topbar.height);
      assert.deepEqual(errors, [], 'No browser runtime errors');
      await page.close();

      const auth = await createPage(browser, width, true);
      for (const route of ['buy', 'messages', 'wallet', 'profile', 'thread/fixture']) {
        await visit(auth.page, route);
        assert.equal((await geometry(auth.page, width)).countryText, 'Belgique', 'Phone country wins over stored CD');
        assert.equal(await auth.page.locator('[data-market-toggle]').count(), 0);
      }
      auth.state.failDetail = true;
      const threadRequests = auth.state.requests['/chat/threads/fixture'];
      await visit(auth.page, 'thread/fixture', '?qa=thread-error');
      await geometry(auth.page, width);
      assert.equal(auth.state.requests['/chat/threads/fixture'], threadRequests + 1);
      assert.deepEqual(auth.errors, [], 'No authenticated runtime errors');
      await auth.page.close();
      console.log(`PASS ${name} ${width}: keyboard, async focus, text zoom, empty/error, authenticated country`);
    }
  } finally {
    await browser.close();
  }
}
console.log(`Topbar browser verification passed. Screenshots: ${outputDir}`);
