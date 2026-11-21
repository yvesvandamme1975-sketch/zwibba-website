import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, webkit, devices } from 'playwright';

const base = process.env.ZWIBBA_E2E_BASE_URL || 'http://127.0.0.1:4351';
const output = process.env.ZWIBBA_E2E_OUTPUT;
if (output) await mkdir(output, { recursive: true });
const listing = {
  id: 'review-fixture', slug: 'review-fixture', title: 'Annonce de recette locale', summary: 'Données interceptées uniquement.',
  categoryId: 'home_garden', countryCode: 'BE', priceAmount: 20, priceCurrency: 'EUR', locationLabel: 'La Louvière',
  images: [], contactActions: ['message'], viewerRole: 'buyer',
  seller: { name: 'Vendeur de recette', sellerId: 'seller-fixture', ratingCount: 0 }, safetyTips: [],
};
for (const [name, engine, device] of [['android', chromium, devices['Pixel 7']], ['iphone', webkit, devices['iPhone 13']]]) {
  const browser = await engine.launch();
  try {
    for (const scenario of ['confirmation', 'eligibility', 'refresh-error', 'eligibility-lost']) {
      if (process.env.REVIEW_CASE && process.env.REVIEW_CASE !== scenario) continue;
      const page = await browser.newPage({ ...device, serviceWorkers: 'block' });
      const errors = [], writes = [];
      let finishReview, reviewStarted;
      let eligible = scenario !== 'eligibility', failReview = true, saved = false;
      const thread = { id: 'thread-fixture', listingTitle: listing.title, participantName: listing.seller.name, messages: [] };
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        Object.defineProperty(window, 'ZWIBBA_API_BASE_URL', { get: () => 'https://api.test.invalid', set: () => {} });
        localStorage.setItem('zwibba_app_auth', JSON.stringify({ session: { sessionToken: 'local-fixture', phoneNumber: '+32470000001' }, pendingChallenge: null }));
      });
      await page.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === 'https://api.test.invalid') {
          let json = { items: [] }, status = 200;
          if (request.method() !== 'GET') writes.push({ path: url.pathname, body: request.postDataJSON() });
          if (url.pathname === '/listings/review-fixture') {
            json = { ...listing, canReview: eligible };
            if (saved && scenario === 'refresh-error') { status = 503; json = { message: 'Annonce temporairement indisponible.' }; }
          }
          else if (url.pathname === '/profile') json = { id: 'buyer-fixture', displayName: 'Acheteur de recette', area: 'La Louvière' };
          else if (url.pathname.includes('/auth/legal')) json = { active: false, needsAcceptance: false, documents: [] };
          else if (url.pathname === '/chat/threads' && request.method() === 'POST') json = thread;
          else if (url.pathname === '/chat/threads/thread-fixture') json = thread;
          else if (url.pathname.endsWith('/messages')) {
            eligible = true;
            thread.messages.push({ id: 'message-fixture', senderRole: 'buyer', body: request.postDataJSON().body, sentAt: new Date().toISOString() });
            json = thread;
          } else if (url.pathname.endsWith('/reviews')) {
            if (!failReview) await new Promise(resolve => { finishReview = resolve; reviewStarted(); });
            status = failReview ? 403 : 201;
            saved = !failReview;
            if (saved && scenario === 'eligibility-lost') eligible = false;
            json = failReview ? { message: 'Envoyez un message dans Zwibba avant de laisser un avis.' } : { id: 'review-local', ...request.postDataJSON() };
          }
          return route.fulfill({ status, json });
        }
        if (url.origin !== new URL(base).origin || request.method() !== 'GET') return route.abort();
        return route.continue();
      });
      await page.goto(`${base}/App/?country=BE#listing/review-fixture`);
      const form = page.locator('form[data-action="submit-review"]');
      if (scenario === 'eligibility') {
        await page.getByText('Envoyez un message dans Zwibba avant de laisser un avis.', { exact: true }).waitFor();
        assert.equal(await form.count(), 0);
        await page.getByRole('button', { name: 'Envoyer un message', exact: true }).tap();
        await page.locator('input[name="threadMessage"]').fill('Message local de recette');
        await page.getByRole('button', { name: 'Envoyer', exact: true }).tap();
        await page.getByText('Message local de recette', { exact: true }).waitFor();
        await page.goBack();
        await form.waitFor({ timeout: 3000 });
      }
      await form.waitFor();
      const submit = form.getByRole('button', { name: 'Envoyer l’avis', exact: true });
      await submit.tap();
      assert.equal(writes.filter(w => w.path.endsWith('/reviews')).length, 0, 'a rating is required');
      await form.getByRole('radio', { name: '4 étoiles', exact: true }).tap();
      assert.equal(await form.getByRole('radio', { name: '4 étoiles', exact: true }).isChecked(), true);
      await form.locator('textarea').tap();
      await page.keyboard.type('Commentaire de recette locale');
      await submit.tap();
      await form.locator('[data-review-message]').filter({ hasText: 'Envoyez un message' }).waitFor();
      assert.equal(await form.locator('textarea').inputValue(), 'Commentaire de recette locale');
      failReview = false;
      const started = new Promise(resolve => { reviewStarted = resolve; });
      await submit.tap();
      await started;
      assert.equal(await submit.isDisabled(), true, 'submission is disabled while pending');
      await page.evaluate(() => { location.hash = '#messages'; });
      await page.waitForURL(url => url.hash === '#messages');
      await page.goBack();
      await form.waitFor();
      assert.equal(await submit.isDisabled(), true, 'rerender keeps the pending guard');
      assert.equal(await form.locator('textarea').inputValue(), 'Commentaire de recette locale');
      await form.evaluate(el => el.requestSubmit());
      finishReview();
      await page.getByText('Votre avis a bien été enregistré.', { exact: true }).waitFor({ timeout: 3000 });
      assert.equal(await form.count(), 0, 'saved form is replaced by confirmation');
      assert.equal(await page.locator('[data-review-message]').evaluate(el => el === document.activeElement), true);
      assert.deepEqual(writes.filter(w => w.path.endsWith('/reviews')).map(w => w.body), [
        { comment: 'Commentaire de recette locale', rating: 4 }, { comment: 'Commentaire de recette locale', rating: 4 },
      ]);
      assert.deepEqual(errors, []);
      if (output) await page.screenshot({ path: `${output}/${name}-${scenario}.png`, scale: 'css' });
      if (scenario === 'confirmation') {
        await page.evaluate(() => { location.hash = '#buy'; });
        await page.waitForURL(url => url.hash === '#buy');
        await page.goBack();
        await form.waitFor();
        assert.equal(await page.getByText('Votre avis a bien été enregistré.', { exact: true }).count(), 0);
      }
      console.log(`${name}: ${scenario}, required rating, touch stars, comment, API error/retry, saved confirmation PASS (intercepted API)`);
      await page.close();
    }
  } finally { await browser.close(); }
}
