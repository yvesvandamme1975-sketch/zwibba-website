import assert from 'node:assert/strict';
import test from 'node:test';

import { syncUnreadMessagesBadge } from '../App/utils/unread-badge-dom.mjs';

function createFakeElement() {
  return {
    attributes: new Map(),
    children: [],
    className: '',
    parent: null,
    textContent: '',
    append(child) {
      child.parent = this;
      this.children.push(child);
    },
    querySelector(selector) {
      if (selector === '.app-tab-shell__nav-badge') {
        return this.children.find((child) => child.className === 'app-tab-shell__nav-badge') ?? null;
      }

      return null;
    },
    remove() {
      if (!this.parent) {
        return;
      }

      this.parent.children = this.parent.children.filter((child) => child !== this);
      this.parent = null;
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
  };
}

function createFakeRoot() {
  const messagesTab = createFakeElement();
  const root = {
    ownerDocument: {
      createElement() {
        return createFakeElement();
      },
    },
    querySelector(selector) {
      return selector === '[data-tab-id="messages"]' ? messagesTab : null;
    },
  };

  return {
    messagesTab,
    root,
  };
}

test('syncUnreadMessagesBadge creates and updates the messages badge without rerendering the shell', () => {
  const { messagesTab, root } = createFakeRoot();

  syncUnreadMessagesBadge(root, 3);
  let badge = messagesTab.querySelector('.app-tab-shell__nav-badge');

  assert.equal(badge.textContent, '3');
  assert.equal(badge.attributes.get('aria-label'), '3 message(s) non lus');

  syncUnreadMessagesBadge(root, 125);
  badge = messagesTab.querySelector('.app-tab-shell__nav-badge');

  assert.equal(badge.textContent, '99+');
  assert.equal(badge.attributes.get('aria-label'), '99+ message(s) non lus');
  assert.equal(messagesTab.children.length, 1);
});

test('syncUnreadMessagesBadge removes the messages badge when there are no unread messages', () => {
  const { messagesTab, root } = createFakeRoot();

  syncUnreadMessagesBadge(root, 2);
  syncUnreadMessagesBadge(root, 0);

  assert.equal(messagesTab.querySelector('.app-tab-shell__nav-badge'), null);
});
