import assert from 'node:assert/strict';
import test from 'node:test';

import { renderAppTabShell } from '../App/components/app-tab-shell.mjs';

test('app tab shell renders the four primary routes with wallet under profile', () => {
  const html = renderAppTabShell({
    activeTab: 'messages',
    content: '<section>Screen</section>',
    unreadMessagesCount: 3,
  });

  assert.match(html, /href="#sell"/);
  assert.match(html, /data-scroll-top-target="sell"/);
  assert.match(html, /href="#buy"/);
  assert.match(html, /data-scroll-top-target="buy"/);
  assert.match(html, /href="#messages"/);
  assert.match(html, /data-scroll-top-target="messages"/);
  assert.doesNotMatch(html, /href="#wallet"/);

  assert.match(html, /href="#profile"/);
  assert.match(html, /data-scroll-top-target="profile"/);
  assert.match(html, /Messages/);
  assert.match(html, /app-tab-shell__nav-badge/);
  assert.match(html, /app-tab-shell__nav-label/);
  assert.match(html, />3</);
  assert.match(html, /app-tab-shell__nav-item is-active/);
});


test('contact footer is outside the scroll content and before navigation, without changing unread navigation', () => {
  const html = renderAppTabShell({content: '<main>Annonce</main>', footer: '<aside>Contacts</aside>', activeTab: 'buy', unreadMessagesCount: 105});
  assert.match(html, /app-tab-shell--with-footer/);
  assert.match(html, /<\/main>\s*<\/div>\s*<aside>Contacts<\/aside>\s*<nav/);
  assert.match(html, /99\+/);
  assert.equal((html.match(/<svg /g) || []).length, 4);
  assert.doesNotMatch(renderAppTabShell(), /app-tab-shell--with-footer/);
});
