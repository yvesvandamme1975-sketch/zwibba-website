import assert from 'node:assert/strict';
import test from 'node:test';

import { renderShareMenu } from '../App/components/share-menu.mjs';

test('renderShareMenu returns nothing when closed', () => {
  assert.equal(renderShareMenu(null), '');
});

test('renderShareMenu renders WhatsApp, Facebook, Instagram and copy options', () => {
  const html = renderShareMenu({
    slug: 'mon-annonce',
    title: 'Belle annonce',
    url: '/annonce/mon-annonce/',
    storyImageUrl: 'https://r2/l1/story.png',
  });

  assert.match(html, /data-action="share-whatsapp-chat"/);
  assert.match(html, /data-action="share-facebook"/);
  assert.match(html, /data-action="share-instagram"/);
  assert.match(html, /data-action="copy-listing-link"/);
  assert.match(html, /data-action="close-share-menu"/);
  assert.match(html, /data-action="share-menu-sheet"/);

  // Listing context is carried on the options for the share handlers.
  assert.match(html, /data-listing-url="\/annonce\/mon-annonce\/"/);
  assert.match(html, /data-story-image-url="https:\/\/r2\/l1\/story\.png"/);

  assert.match(html, />WhatsApp</);
  assert.match(html, />Instagram</);
});
