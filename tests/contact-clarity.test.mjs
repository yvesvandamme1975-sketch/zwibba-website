import assert from 'node:assert/strict';
import test from 'node:test';
import { renderBuyScreen } from '../App/features/home/buy-screen.mjs';
import { renderHomeScreen } from '../App/features/home/home-screen.mjs';
import { renderListingDetailScreen } from '../App/features/listings/listing-detail-screen.mjs';
import { createBuyerBrowseController } from '../App/features/home/buyer-browse-controller.mjs';

for (const render of [renderBuyScreen, renderHomeScreen]) {
  test(`${render.name} distinguishes unavailable feed and offers retry`, () => {
    const html = render({ categories: [], featuredListings: [], recentListings: [], feedStatus: 'error' });
    assert.match(html, /Impossible de charger les annonces/);
    assert.match(html, /data-action="retry-buyer-feed"/);
    assert.doesNotMatch(html, /Aucune annonce/);
    assert.equal((html.match(/data-action="retry-buyer-feed"/g) || []).length, 1);
  });
  test(`${render.name} communicates the active category`, () => {
    const html = render({ categories: [{id:'vehicles', label:'Véhicules'}], selectedCategoryId:'vehicles', featuredListings:[], recentListings:[] });
    assert.match(html, /<button[^>]*aria-pressed="true"[^>]*data-category-id="vehicles"/);
    assert.match(html, /<button[^>]*aria-pressed="false"[^>]*data-category-id=""/);
  });
}
test('buyer contact precedes photo and optional review', () => {
  const html = renderListingDetailScreen({ state:'ready', detail:{ id:'item', title:'Objet', summary:'Description', locationLabel:'Bruxelles', priceAmount:10, priceCurrency:'EUR', seller:{name:'Vendeur'}, safetyTips:['Lieu public'], contactActions:['message'], images:[] } });
  assert.ok(html.indexOf('data-contact-actions') < html.indexOf('Votre avis'));
  assert.ok(html.indexOf('data-contact-actions') < html.indexOf('Description'));
});
test('feed controller recovers from temporary failure on retry', async () => {
  let attempts = 0;
  const c = createBuyerBrowseController({listingsService:{listBrowseFeed:async()=>{if(++attempts===1)throw new Error('offline');return {items:[{id:'1',title:'Objet'}]};}}});
  await assert.rejects(c.loadFeed({countryCode:'CD'}));
  assert.equal(c.state.feedStatus,'error');
  await c.loadFeed({countryCode:'CD'});
  assert.equal(c.state.feedStatus,'ready');
  assert.equal(c.state.feedItems.length,1);
});
