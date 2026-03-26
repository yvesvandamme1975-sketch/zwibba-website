import assert from 'node:assert/strict';
import test from 'node:test';

import { renderInboxScreen } from '../App/features/chat/inbox-screen.mjs';
import { renderThreadScreen } from '../App/features/chat/thread-screen.mjs';

test('messages inbox screen renders live thread summaries inside the beta shell', () => {
  const html = renderInboxScreen({
    items: [
      {
        id: 'thread_1',
        lastMessagePreview: 'Toujours disponible ?',
        listingSlug: 'samsung-galaxy-a54',
        listingTitle: 'Samsung Galaxy A54',
        participantName: 'Acheteur Zwibba',
        unreadCount: 1,
      },
    ],
    state: 'ready',
  });

  assert.match(html, /Messages Zwibba/);
  assert.match(html, /Samsung Galaxy A54/);
  assert.match(html, /Acheteur Zwibba/);
  assert.match(html, /Toujours disponible \?/);
  assert.match(html, /href="#thread\/thread_1"/);
});

test('messages inbox screen shows a verification prompt without a session', () => {
  const html = renderInboxScreen({
    state: 'locked',
  });

  assert.match(html, /Vérifiez votre numéro/i);
  assert.match(html, /href="#auth-welcome"/);
});

test('thread screen renders buyer and seller messages with a send form', () => {
  const html = renderThreadScreen({
    draftMessage: 'Oui, toujours disponible.',
    isSending: false,
    thread: {
      id: 'thread_1',
      listingTitle: 'Samsung Galaxy A54',
      messages: [
        {
          body: 'Toujours disponible ?',
          id: 'message_1',
          senderRole: 'buyer',
          sentAtLabel: '09:10',
        },
        {
          body: 'Oui, toujours disponible.',
          id: 'message_2',
          senderRole: 'seller',
          sentAtLabel: '09:12',
        },
      ],
      participantName: 'Acheteur Zwibba',
    },
  });

  assert.match(html, /Retour aux messages/);
  assert.match(html, /Samsung Galaxy A54/);
  assert.match(html, /Acheteur Zwibba/);
  assert.match(html, /data-thread-id="thread_1"/);
  assert.match(html, /Toujours disponible \?/);
  assert.match(html, /Oui, toujours disponible\./);
  assert.match(html, /name="threadMessage"/);
  assert.match(html, /Envoyer/);
});
