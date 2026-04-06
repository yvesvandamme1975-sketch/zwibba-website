import assert from 'node:assert/strict';
import test from 'node:test';

import { renderAppTabShell } from '../App/components/app-tab-shell.mjs';

test('app tab shell renders the five persistent beta routes', () => {
  const html = renderAppTabShell({
    activeTab: 'messages',
    content: '<section>Screen</section>',
    unreadMessagesCount: 3,
  });

  assert.match(html, /href="#sell"/);
  assert.match(html, /href="#buy"/);
  assert.match(html, /href="#messages"/);
  assert.match(html, /href="#wallet"/);
  assert.match(html, /href="#profile"/);
  assert.match(html, /Messages/);
  assert.match(html, /app-tab-shell__nav-badge/);
  assert.match(html, /app-tab-shell__nav-label/);
  assert.match(html, />3</);
  assert.match(html, /app-tab-shell__nav-item is-active/);
});
