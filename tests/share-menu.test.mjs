import assert from 'node:assert/strict';
import test from 'node:test';

import { renderShareMenu } from '../App/components/share-menu.mjs';

test('renderShareMenu returns nothing when closed', () => {
  assert.equal(renderShareMenu(null), '');
});

test('renderShareMenu renders WhatsApp, Facebook, Instagram, TikTok and copy options', () => {
  const html = renderShareMenu({
    slug: 'mon-annonce',
    title: 'Belle annonce',
    url: '/annonce/mon-annonce/',
    storyImageUrl: 'https://r2/l1/story.png',
  });

  assert.match(html, /data-action="share-whatsapp-chat"/);
  assert.match(html, /data-action="share-facebook"/);
  assert.match(html, /data-action="share-instagram"/);
  assert.match(html, /data-action="share-tiktok"/);
  assert.match(html, /data-action="copy-listing-link"/);
  assert.match(html, /data-action="close-share-menu"/);
  assert.match(html, /data-action="share-menu-sheet"/);

  // Listing context is carried on the options for the share handlers.
  assert.match(html, /data-listing-url="\/annonce\/mon-annonce\/"/);
  assert.match(html, /data-story-image-url="https:\/\/r2\/l1\/story\.png"/);

  assert.match(html, />WhatsApp</);
  assert.match(html, />Instagram</);
  assert.match(html, />TikTok</);
});

test('renderShareMenu exposes a post/story mode toggle', () => {
  const post = renderShareMenu({ url: '/annonce/x/', mode: 'post' });
  assert.match(post, /data-action="share-mode-post"/);
  assert.match(post, /data-action="share-mode-story"/);
  assert.match(post, /share-mode-post"[^>]*aria-pressed="true"/);

  const story = renderShareMenu({ url: '/annonce/x/', mode: 'story' });
  assert.match(story, /share-mode-story"[^>]*aria-pressed="true"/);
  assert.match(story, /story|statut/i);
});
