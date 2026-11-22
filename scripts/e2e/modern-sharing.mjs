import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
        window.shareOutcome = 'pending';
        Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
        Object.defineProperty(navigator, 'share', { configurable: true, value: data => {
          window.shareCalls.push({ ...data, active: navigator.userActivation.isActive });
          if (window.shareOutcome === 'pending') return new Promise((resolve,reject) => { window.finishShare = resolve; window.cancelShare = reject; });
          return window.shareOutcome === 'success' ? Promise.resolve() : Promise.reject(new DOMException('test', window.shareOutcome));
        } });
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Denied')) } });
      });
      let storyRequests = 0;
      let failStory = false;
      let withoutPhoto = false;
      await page.route('https://api.test.invalid/**', route => {
        if (new URL(route.request().url()).pathname === '/share/velo-test/story.png') {
          storyRequests++;
          if (failStory) return route.fulfill({status: 503, json: {message: "Image indisponible"}});
          return route.fulfill({ contentType:'image/png', headers:{'cache-control':'no-store'}, body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64') });
        }
        const detail = { id: 'velo', slug: 'velo-test', title: 'Vélo de Liège', categoryId: 'sports', priceAmount: 120, priceCurrency: 'EUR', locationLabel: 'Liège', images: withoutPhoto ? [] : ['https://image.test.invalid/photo.png'], storyImageUrl: null, viewerRole: 'buyer', contactActions: [], safetyTips: [], summary: 'Vélo de test', seller: { displayName: 'Vendeur', area: 'Liège' } };
        return route.fulfill({ json: new URL(route.request().url()).pathname === '/listings/velo-test' ? detail : { items: [] } });
      });
      await page.route('https://image.test.invalid/photo.png', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64') }));
      await page.goto(`${baseUrl}/App/#listing/velo-test`);
      const share = page.getByRole('button', { name: 'Partager cette annonce', exact: true });
      const dialog = page.getByRole('dialog', { name: 'Partager l’annonce' });
      await share.click();
      await page.waitForFunction(() => window.shareCalls.length === 1);
      assert.equal(await dialog.count(), 0, 'native share must not show a second Zwibba panel');
      assert.equal(await page.locator('[inert]').count(), 0);
      await share.click();
      assert.equal(await page.evaluate(() => window.shareCalls.length), 1, 'pending share ignores repeated clicks');
      await page.evaluate(() => window.cancelShare(new DOMException('cancelled','AbortError')));
      await dialog.waitFor({ state: 'detached' });
      assert.equal(await page.locator('[inert]').count(), 0);
      let calls = await page.evaluate(() => window.shareCalls);
      assert.deepEqual(Object.keys(calls[0]).sort(), ['active', 'url']);
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

      assert.equal(storyRequests, 0, 'browsing and link sharing must not generate a story');
      const beforeStory = await page.evaluate(() => window.shareCalls.length);
      await page.getByRole('button', { name: 'Story Instagram', exact: true }).click();
      await page.getByRole('button', { name: 'Instagram ou autre application…', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => window.shareCalls.length), beforeStory);
      assert.equal(storyRequests, 1, 'story is requested only after the story entry is opened');
      await page.evaluate(() => { window.shareOutcome = 'success'; });
      await page.getByRole('button', { name: 'Instagram ou autre application…', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.innerText.includes('Demande transmise'));
      calls = await page.evaluate(() => window.shareCalls.map(c => ({ active: c.active, url: c.url, files: c.files?.map(f => ({ size: f.size, type: f.type })) })));
      assert.equal(calls.at(-1).active, true);
      assert.equal(calls.at(-1).url, undefined);
      assert.equal(calls.at(-1).files[0].type, 'image/png');
      assert.ok(calls.at(-1).files[0].size > 0);
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 0);
      assert.equal(await page.locator('[inert]').count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Story Instagram', exact: true }).evaluate(el => document.activeElement === el), true);

      await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
      await share.click();
      await dialog.waitFor();
      assert.equal(await page.getByRole('button', { name: 'Copier le lien', exact: true }).isVisible(), true);
      assert.equal(await page.getByRole('button', { name: 'Partager le lien', exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const first = dialog.locator('button:enabled').first();
      await first.focus();
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Fermer');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('[role="dialog"]'))), true);
      await page.keyboard.press('Escape');
      // No file-sharing support: save the generated story and import it manually.
      failStory = true;
      await page.getByRole('button', { name: 'Story Instagram', exact: true }).click();
      await page.getByRole('button', { name: 'Réessayer de préparer l’image', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Enregistrer l’image', exact: true }).count(), 0);
      failStory = false;
      await page.getByRole('button', { name: 'Réessayer de préparer l’image', exact: true }).click();
      await page.getByRole('button', { name: 'Enregistrer l’image', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Instagram ou autre application…', exact: true }).count(), 0);
      assert.match(await dialog.innerText(), /Créer une story/);
      assert.match(await dialog.innerText(), /autocollant Lien/);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Enregistrer l’image', exact: true }).click();
      const download = await downloadPromise;
      assert.equal(download.suggestedFilename(), 'zwibba-story.png');
      const bytes = await readFile(await download.path());
      assert.equal(bytes.subarray(1,4).toString(), 'PNG');
      await page.getByRole('button', { name: 'Copier le lien', exact: true }).click();
      assert.equal(await manual.inputValue(), `${new URL(baseUrl).origin}/annonce/velo-test/`);
      await page.keyboard.press('Escape');
      assert.equal(storyRequests, 3, 'one initial story, one failed explicit open and one explicit retry');
      withoutPhoto = true;
      await page.reload();
      await share.waitFor();
      await page.evaluate(() => Object.defineProperty(navigator, 'share', { configurable: true, value: undefined }));
      assert.equal(await page.getByRole('button', { name: 'Story Instagram', exact: true }).count(), 0);
      await share.click();
      await dialog.waitFor();
      assert.equal(await dialog.getByRole('button', { name: 'Copier le lien', exact: true }).isVisible(), true);
      assert.equal(await page.getByRole('button', { name: 'Story Instagram', exact: true }).count(), 0);
      assert.equal(storyRequests, 3, 'no story request from the photo-less listing');
      await page.keyboard.press('Escape');
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`PASS ${engineName} ${width}px: one-click native link, no intermediate menu, cancel/focus, error/copy, story file, unsupported fallback, no-photo story hidden, keyboard (OS boundary simulated)`);
    }
  } finally { await browser.close(); }
}
