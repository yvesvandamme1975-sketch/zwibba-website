import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';

const baseUrl = process.env.ZWIBBA_E2E_BASE_URL || 'http://127.0.0.1:4328';
for (const [engineName, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    for (const width of [320, 390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        Object.defineProperty(window, 'ZWIBBA_API_BASE_URL', { get: () => 'https://api.test.invalid', set: () => {} });
        window.shareCalls = [];
        window.shareOutcome = 'AbortError';
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(navigator, 'share', { configurable: true, value: data => {
          window.shareCalls.push({ ...data, active: navigator.userActivation.isActive });
          return window.shareOutcome === 'success' ? Promise.resolve() : Promise.reject(new DOMException('test', window.shareOutcome));
        } });
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Denied')) } });
      });
      await page.route('https://api.test.invalid/**', route => {
        const detail = { id: 'velo', slug: 'velo-test', title: 'Vélo de Liège', categoryId: 'sports', priceAmount: 120, priceCurrency: 'EUR', locationLabel: 'Liège', images: [], storyImageUrl: 'https://image.test.invalid/story.png', viewerRole: 'buyer', contactActions: [], safetyTips: [], summary: 'Vélo de test', seller: { displayName: 'Vendeur', area: 'Liège' } };
        return route.fulfill({ json: new URL(route.request().url()).pathname === '/listings/velo-test' ? detail : { items: [] } });
      });
      await page.route('https://image.test.invalid/story.png', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64') }));
      await page.goto(`${baseUrl}/App/#listing/velo-test`);
      const share = page.getByRole('button', { name: 'Partager cette annonce', exact: true });
      const dialog = page.getByRole('dialog', { name: 'Partager l’annonce' });
      await share.click();
      await page.waitForFunction(() => window.shareCalls.length === 1);
      await dialog.waitFor({ state: 'detached' });
      assert.equal(await page.locator('[inert]').count(), 0);
      let calls = await page.evaluate(() => window.shareCalls);
      assert.equal(calls[0].url, `${new URL(baseUrl).origin}/annonce/velo-test/`);
      assert.equal(calls[0].active, true);
      assert.equal(await share.evaluate(el => document.activeElement === el), true);

      await page.evaluate(() => { window.shareOutcome = 'success'; });
      await share.click();
      await page.waitForFunction(() => window.shareCalls.length === 2);
      await dialog.waitFor({ state: 'detached' });
      assert.equal(await page.locator('[inert]').count(), 0);
      assert.equal(await share.evaluate(el => document.activeElement === el), true);

      await page.evaluate(() => { window.shareOutcome = 'NotAllowedError'; });
      await share.click();
      await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.innerText.includes('Le partage n’a pas pu démarrer'));
      await page.getByRole('button', { name: 'Copier le lien', exact: true }).click();
      const manual = page.locator('[data-share-manual]');
      await manual.waitFor();
      assert.equal(await manual.inputValue(), `${new URL(baseUrl).origin}/annonce/velo-test/`);
      assert.doesNotMatch(await dialog.innerText(), /Lien copié/);
      await page.getByRole('button', { name: 'Fermer', exact: true }).click();

      const beforeStory = await page.evaluate(() => window.shareCalls.length);
      await page.getByRole('button', { name: 'Partager en story', exact: true }).click();
      await page.getByRole('button', { name: 'Partager l’image…', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.shareCalls.length), beforeStory);
      await page.evaluate(() => { window.shareOutcome = 'success'; });
      await page.getByRole('button', { name: 'Partager l’image…', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.innerText.includes('Demande transmise'));
      calls = await page.evaluate(() => window.shareCalls.map(c => ({ active: c.active, url: c.url, files: c.files?.map(f => ({ size: f.size, type: f.type })) })));
      assert.equal(calls.at(-1).active, true);
      assert.equal(calls.at(-1).url, undefined);
      assert.equal(calls.at(-1).files[0].type, 'image/png');
      assert.ok(calls.at(-1).files[0].size > 0);
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 0);
      assert.equal(await page.locator('[inert]').count(), 0);

      await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
      await share.click();
      await dialog.waitFor();
      assert.equal(await page.getByRole('button', { name: 'Copier le lien', exact: true }).isVisible(), true);
      assert.equal(await page.getByRole('button', { name: 'Partager avec une application…', exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const first = dialog.locator('button:enabled').first();
      await first.focus();
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Fermer');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('[role="dialog"]'))), true);
      await page.keyboard.press('Escape');
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS ${engineName} ${width}px: direct link, cancel/focus, error/copy, story file, unsupported fallback, keyboard (OS boundary simulated)`);
    }
  } finally { await browser.close(); }
}
