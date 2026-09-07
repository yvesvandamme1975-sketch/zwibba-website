import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, 'ZWIBBA_API_BASE_URL', { get: () => 'https://api.test.invalid', set: () => {} });
      window.shareCalls = [];
      Object.defineProperty(navigator, 'share', { configurable: true, value: data => {
        window.shareCalls.push(data);
        return Promise.reject(new DOMException('Cancelled', 'AbortError'));
      } });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Denied')) } });
    });
    await page.route('https://api.test.invalid/**', route => {
      const url = new URL(route.request().url());
      const detail = { slug: 'velo-test', title: 'Vélo de Liège', categoryId: 'sports', priceAmount: 120, priceCurrency: 'EUR', locationLabel: 'Liège', images: [], primaryImageUrl: null, storyImageUrl: null, viewerRole: 'buyer', contactActions: [], safetyTips: [], summary: 'Vélo de test', seller: { displayName: 'Vendeur', area: 'Liège' } };
      return route.fulfill({ json: url.pathname === '/listings/velo-test' ? detail : { items: [] } });
    });
    await page.goto('http://127.0.0.1:4328/App/#listing/velo-test');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-action="open-share-menu"]').first().click();
    const dialog = page.getByRole('dialog', { name: 'Partager l’annonce' });
    await dialog.waitFor();
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('[role="dialog"]'))), true);
    await page.getByRole('button', { name: 'Partager avec une application…' }).click();
    assert.equal(await page.evaluate(() => window.shareCalls.length), 1);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'share-native-link');
    await page.getByRole('button', { name: 'Copier le lien', exact: true }).click();
    await page.locator('[data-share-manual]').waitFor();
    assert.match(await page.locator('[data-share-manual]').inputValue(), /\/annonce\/velo-test\/$/);
    assert.doesNotMatch(await dialog.innerText(), /Lien copié/);
    await page.locator('[data-share-announcement]').filter({ hasText: 'La copie automatique' }).waitFor({ state: 'attached' });
    await page.getByRole('button', { name: 'Instagram', exact: true }).click();
    assert.match(await dialog.innerText(), /Ouvrez ensuite Instagram/);
    assert.match(await dialog.innerText(), /Copier la légende/);
    await page.screenshot({ path: `/private/tmp/zwibba-sharing-${width}.png`, animations: 'disabled' });
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 845, 'dialog stays inside viewport');
    const first = dialog.locator('button:enabled').first();
    await first.focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Fermer');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('[role="dialog"]'))), true);
    await page.keyboard.press('Escape');
    assert.equal(await dialog.count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'open-share-menu');
    assert.equal(await page.locator('[inert]').count(), 0);
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS sharing browser ${width}px: cancel, clipboard fallback, instructions, keyboard, focus restoration`);
  }
} finally {
  await browser.close();
}
