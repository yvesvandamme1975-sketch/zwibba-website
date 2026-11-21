import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { renderListingContactActions } from '../../App/features/listings/listing-detail-screen.mjs';

const baseUrl = process.env.ZWIBBA_E2E_BASE_URL || 'http://127.0.0.1:4342';
const fixture = {
  id: 'layout', slug: 'layout', title: 'Bouilloire rouge', summary: 'Bouilloire électrique rouge avec anse noire.',
  categoryId: 'home_garden', countryCode: 'BE', priceAmount: 20, priceCurrency: 'EUR', locationLabel: 'La Louvière',
  images: ['/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.jpg', '/assets/listings/samsung-galaxy-a54-neuf-lubumbashi.jpg'],
  contactActions: ['message', 'whatsapp', 'call'], contactPhoneNumber: '+32470000000', viewerRole: 'buyer',
  seller: { name: 'Vendeur Test', sellerId: 'seller', memberSince: '2026-08-01', ratingCount: 0 },
  safetyTips: ['Rencontrez le vendeur dans un lieu public.'], canReview: true,
};
let passed = 0;
for (const [engineName, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  const browser = await engine.launch();
  try {
    for (const [width, height] of [[320,568], [390,664], [412,839], [768,1024], [920,844], [1440,1000], [844,390]]) {
      const page = await browser.newPage({viewport:{width,height},serviceWorkers:'block',reducedMotion:'reduce'});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => Object.defineProperty(window, 'ZWIBBA_API_BASE_URL', {get: () => 'https://api.test.invalid', set: () => {}}));
      let owner = false;
      let noPhone = false;
      await page.route('https://api.test.invalid/**', route => route.fulfill({json:
        new URL(route.request().url()).pathname.startsWith('/listings/')
          ? {...fixture, viewerRole: owner ? 'owner' : 'buyer', canPause: owner, contactPhoneNumber: noPhone ? '' : fixture.contactPhoneNumber}
          : {items: []}}));
      await page.goto(`${baseUrl}/App/?country=BE#listing/layout`);
      await page.locator('.app-detail__contact-dock').waitFor();
      const nav = page.locator('.app-tab-shell__nav');
      const dock = page.locator('.app-detail__contact-dock');
      const content = page.locator('.app-tab-shell__content');
      const bounds = await Promise.all([content.boundingBox(),dock.boundingBox(),nav.boundingBox()]);
      assert.ok(bounds[0].y+bounds[0].height <= bounds[1].y+1, 'contacts must not obscure content');
      assert.ok(bounds[1].y+bounds[1].height <= bounds[2].y+1, 'navigation must not obscure contacts');
      assert.ok(bounds[2].y+bounds[2].height <= height+1, 'navigation fits viewport');
      if (width >= 390 && width <= 640 && height >= 664) {
        const price = await page.locator('.app-detail__price').boundingBox();
        assert.ok(price.y+price.height <= bounds[1].y, 'price visible in first screen');
      }
      assert.equal(await page.getByRole('button',{name:'Envoyer un message',exact:true}).count(),1);
      assert.equal(await nav.locator('svg').count(),4);
      assert.equal(await nav.locator('[aria-current="page"]').getAttribute('href'),'#buy');
      for (const button of await dock.locator('button,a').all()) {
        const box = await button.boundingBox(); assert.ok(box.width>=44 && box.height>=44);
      }
      await page.getByRole('button',{name:'Voir la photo 2',exact:true}).click();
      assert.equal(await page.locator('.app-detail__photo-count').innerText(),'2 / 2');
      await content.evaluate(el=>el.scrollTop=60);
      const scrollBefore = await content.evaluate(el=>el.scrollTop);
      await page.getByRole('button',{name:'Voir la photo 1',exact:true}).focus();
      const focusedScroll = await content.evaluate(el=>el.scrollTop);
      await page.keyboard.press('Space');
      await page.waitForFunction(()=>document.querySelector('.app-detail__photo-count')?.textContent==='1 / 2');
      assert.equal(await content.evaluate(el=>el.scrollTop),focusedScroll);
      assert.equal(await page.getByRole('button',{name:'Voir la photo 1',exact:true}).evaluate(el=>el===document.activeElement),true);
      if (width <= 768) assert.ok(scrollBefore > 0, 'mobile content actually scrolled');
      const originalDock = await dock.evaluate(el=>el.outerHTML);
      await dock.evaluate((el,html)=>el.outerHTML=html,renderListingContactActions({detail:fixture,contactError:'Erreur de connexion. '.repeat(30)}));
      assert.ok((await dock.boundingBox()).height <= height*0.4+1);
      assert.ok((await content.boundingBox()).height >= height*0.3);
      assert.ok((await dock.locator('a[href="#messages"]').boundingBox()).height >= 44);
      await dock.evaluate((el,html)=>el.outerHTML=html,originalDock);
      await page.locator('.app-detail__review-form').evaluate(el=>el.scrollIntoView({block:'end'}));
      const after = await dock.boundingBox(); assert.equal(Math.round(after.y),Math.round(bounds[1].y));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      // Text enlargement must expand the reserved rows rather than overlap content.
      await page.evaluate(()=>document.documentElement.style.fontSize='200%');
      const zoomBounds = await Promise.all([content.boundingBox(),dock.boundingBox(),nav.boundingBox()]);
      assert.ok(zoomBounds[0].height >= height*0.3 && zoomBounds[0].y+zoomBounds[0].height <= zoomBounds[1].y+1);
      assert.ok(zoomBounds[2].y+zoomBounds[2].height <= height+1);
      assert.equal(await dock.locator('button,a').evaluateAll(items=>items.some(el=>el.scrollWidth>el.clientWidth+1)), false);
      assert.equal(await nav.locator('.app-tab-shell__nav-label').evaluateAll(items=>items.some(el=>el.scrollWidth>el.clientWidth+1)),false);
      await page.evaluate(()=>document.documentElement.style.fontSize='');
      await page.locator('.app-detail__review-form textarea').focus();
      assert.equal(await dock.isVisible(),true);
      await page.keyboard.type('Avis de test local');
      assert.equal(await page.locator('.app-detail__review-form textarea').inputValue(),'Avis de test local');
      await page.locator('.app-detail__review-form textarea').evaluate(el=>el.blur());
      await dock.waitFor();
      // Auth-gated contact is exercised without creating a thread or sending a message.
      await page.getByRole('button',{name:'Envoyer un message',exact:true}).click();
      await page.waitForFunction(()=>!location.hash.startsWith('#listing/'));
      await dock.waitFor({state:'detached'});
      assert.equal(await dock.count(),0, 'contact dock must disappear after leaving listing');
      noPhone = true;
      await page.goto(`${baseUrl}/App/?country=BE#listing/layout-no-phone`);
      await dock.waitFor(); assert.equal(await dock.locator('a[href^="https://wa.me"],a[href^="tel:"]').count(),0);
      owner = true;
      await page.goto(`${baseUrl}/App/?country=BE#listing/layout-owner`);
      await page.getByText('Gérer mon annonce',{exact:true}).waitFor();
      assert.equal(await dock.count(),0); assert.equal(await page.getByText('Mettre en pause',{exact:true}).count(),1);
      if (width === 390) {
        owner = false;
        await page.context().addCookies([{name: 'zwibba_geo', value: 'BE', url: baseUrl}]);
        await page.evaluate(()=>localStorage.removeItem('zwibba_app_country'));
        await page.goto(`${baseUrl}/App/#listing/layout-country`);
        const banner = page.locator('.country-banner');
        await banner.waitFor();
        assert.equal(await banner.evaluate(el=>getComputedStyle(el).position), 'static');
        await page.getByRole('button',{name:'Voir la Belgique',exact:true}).click();
        await banner.waitFor({state:'detached'});
        for (const tab of ['buy','sell','messages','profile']) {
          await nav.locator(`[data-tab-id="${tab}"]`).click();
          await dock.waitFor({state:'detached'});
          await page.evaluate(()=>{
            document.documentElement.style.fontSize='200%';
            const end=document.createElement('button'); end.id='layout-end';end.textContent='Fin';
            end.style.minHeight='44px'; document.querySelector('.app-tab-shell__content').append(end);
            end.scrollIntoView({block:'end',behavior:'instant'});
          });
          const end=await page.locator('#layout-end').boundingBox(),navBox=await nav.boundingBox();
          assert.ok(end.y+end.height<=navBox.y+1, `last control remains reachable on ${tab}: ${JSON.stringify({end,navBox})}`);
          assert.equal(await nav.locator('.app-tab-shell__nav-label').evaluateAll(items=>items.some(el=>el.scrollWidth>el.clientWidth+1)),false);
          await page.evaluate(()=>{document.documentElement.style.fontSize='';document.querySelector('#layout-end')?.remove();});
        }
      }
      assert.deepEqual(errors,[]);
      passed++; await page.close();
    }
    const reviewPage = await browser.newPage({viewport:{width:390,height:664},serviceWorkers:'block'});
    await reviewPage.addInitScript(() => {
      Object.defineProperty(window, 'ZWIBBA_API_BASE_URL', {get: () => 'https://api.test.invalid', set: () => {}});
      localStorage.setItem('zwibba_app_auth', JSON.stringify({pendingChallenge:null,session:{sessionToken:'local-e2e-only',phoneNumber:'+32470000001'}}));
    });
    let reviewPayload = null;
    await reviewPage.route('https://api.test.invalid/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (path === '/listings/layout/reviews' && request.method() === 'POST') {
        reviewPayload = request.postDataJSON();
        return route.fulfill({status:400,json:{message:'Avis intercepté par le test local.'}});
      }
      return route.fulfill({json:path.startsWith('/listings/') ? fixture : path === '/auth/legal-status' ? {active:false,needsAcceptance:false} : {items:[]}});
    });
    await reviewPage.goto(`${baseUrl}/App/?country=BE#listing/layout`);
    await reviewPage.waitForLoadState('networkidle');
    await reviewPage.getByRole('radio',{name:'5 étoiles',exact:true}).check();
    await reviewPage.locator('.app-detail__review-form textarea').fill('Avis local après saisie');
    assert.equal(await reviewPage.locator('.app-detail__contact-dock').isVisible(),true);
    await reviewPage.getByRole('button',{name:'Envoyer l’avis',exact:true}).click();
    await reviewPage.getByText('Avis intercepté par le test local.',{exact:true}).waitFor();
    assert.deepEqual(reviewPayload,{comment:'Avis local après saisie',rating:5});
    await reviewPage.close();
  } finally { await browser.close(); }
  console.log(`${engineName}: listing, contact dock, navigation, owner and review submission checks passed`);
}
console.log(`${passed} viewport checks passed (browser emulation, no physical device claim)`);
