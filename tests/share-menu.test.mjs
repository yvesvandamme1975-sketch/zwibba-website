import assert from 'node:assert/strict';
import test from 'node:test';

import { renderShareMenu } from '../App/components/share-menu.mjs';

test('renderShareMenu returns nothing when closed', () => {
  assert.equal(renderShareMenu(null), '');
});

test('share menu delegates destination choice to the phone and keeps copy fallback', () => {
  const html = renderShareMenu({slug: 'mon-annonce', title: 'Belle annonce', url: '/annonce/mon-annonce/', canShareLink: true});
  assert.match(html, /data-action="share-native-link"/);
  assert.match(html, /data-action="copy-listing-link"/);
  assert.match(html, /data-action="close-share-menu"/);
  assert.doesNotMatch(html, /data-action="share-(?:whatsapp-chat|facebook|instagram|tiktok)"/);
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

test('share menu exposes native link independently of file support and honest status', () => {
  const html = renderShareMenu({ title: '<Vélo>', canShareLink: true, imageStatus: 'preparing', message: 'Préparation…' });
  assert.match(html, /data-action="share-native-link"/);
  assert.match(html, /&lt;Vélo&gt;/);
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /L.image story est téléchargée|Le lien de l.annonce est partagé/);
  assert.doesNotMatch(html, /data-action="share-native-image"/);
});

test('story menu distinguishes preparation, unavailable, download and native file handoff', () => {
  const preparing = renderShareMenu({ mode: 'story', imageStatus: 'preparing' });
  assert.match(preparing, /Préparation de l.image/);
  assert.doesNotMatch(preparing, /data-action="download-story-image"/);
  const unavailable = renderShareMenu({ mode: 'story', imageStatus: 'unavailable', storyImageUrl: 'https://cdn/image.png' });
  assert.match(unavailable, /data-action="retry-share-image"/);
  const ready = renderShareMenu({ mode: 'story', imageStatus: 'ready', canShareImage: true });
  assert.match(ready, /data-action="download-story-image"/);
  assert.match(ready, /data-action="share-native-image"/);
  assert.match(ready, /Copier la légende/);
});

test('manual clipboard fallback is selectable and escaped, busy actions disabled', () => {
  const html = renderShareMenu({ busy: true, manualText: '</textarea><script>bad</script>' });
  assert.match(html, /readonly/);
  assert.match(html, /&lt;\/textarea&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /data-action="copy-listing-link"[^>]*disabled/);
});
