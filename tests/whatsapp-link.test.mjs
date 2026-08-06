import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWhatsAppChatLink } from '../App/utils/whatsapp-link.mjs';

test('builds a wa.me link from an E.164 number with prefilled text', () => {
  assert.equal(
    buildWhatsAppChatLink('+243 990 000 001', 'Bonjour'),
    'https://wa.me/243990000001?text=Bonjour',
  );
});

test('encodes the prefilled text', () => {
  assert.equal(
    buildWhatsAppChatLink('+32499000001', 'Bonjour, ça va ?'),
    `https://wa.me/32499000001?text=${encodeURIComponent('Bonjour, ça va ?')}`,
  );
});

test('omits the text parameter when empty and rejects empty numbers', () => {
  assert.equal(buildWhatsAppChatLink('+243990000001'), 'https://wa.me/243990000001');
  assert.equal(buildWhatsAppChatLink(''), null);
  assert.equal(buildWhatsAppChatLink('   '), null);
  assert.equal(buildWhatsAppChatLink(undefined), null);
});
