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

test('listing share sheet is link-only: no story mode even when a story mode is requested', () => {
  for (const mode of ['post', 'story', undefined]) {
    const html = renderShareMenu({ url: '/annonce/x/', mode, canShareLink: true, imageStatus: 'ready', canShareImage: true, storyImageUrl: 'https://cdn/story.png' });
    assert.doesNotMatch(html, /share-mode-(?:post|story)/);
    assert.doesNotMatch(html, /En story|en story/);
    assert.doesNotMatch(html, /data-action="(?:share-native-image|download-story-image|retry-share-image|copy-share-caption)"/);
    assert.match(html, /data-action="share-native-link"/);
    assert.match(html, /data-action="copy-listing-link"/);
    assert.match(html, /Partagez le lien de cette annonce/);
  }
});

test('success context keeps the post/story mode toggle (non-regression)', () => {
  const post = renderShareMenu({ url: '/annonce/x/', mode: 'post', storyEnabled: true });
  assert.match(post, /data-action="share-mode-post"/);
  assert.match(post, /data-action="share-mode-story"/);
  assert.match(post, /share-mode-post"[^>]*aria-pressed="true"/);

  const story = renderShareMenu({ url: '/annonce/x/', mode: 'story', storyEnabled: true });
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

test('image preparation state never leaks into the link-only sheet', () => {
  for (const imageStatus of ['preparing', 'unavailable', 'ready']) {
    const html = renderShareMenu({ imageStatus, storyImageUrl: 'https://cdn/image.png', canShareImage: true });
    assert.doesNotMatch(html, /Préparation de l.image|Image prête|indisponible pour le moment/);
    assert.doesNotMatch(html, /Copier la légende|Enregistrer l.image|Partager l.image/);
  }
});

test('success-context story menu distinguishes preparation, unavailable, download and native file handoff (non-regression)', () => {
  const preparing = renderShareMenu({ storyEnabled: true, mode: 'story', imageStatus: 'preparing' });
  assert.match(preparing, /Préparation de l.image/);
  assert.doesNotMatch(preparing, /data-action="download-story-image"/);
  const unavailable = renderShareMenu({ storyEnabled: true, mode: 'story', imageStatus: 'unavailable', storyImageUrl: 'https://cdn/image.png' });
  assert.match(unavailable, /data-action="retry-share-image"/);
  const ready = renderShareMenu({ storyEnabled: true, mode: 'story', imageStatus: 'ready', canShareImage: true });
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
