import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDisplayName } from '../../src/common/display-name';

test('normalizeDisplayName trims whitespace', () => {
  assert.equal(normalizeDisplayName('  Marie K.  '), 'Marie K.');
});

test('normalizeDisplayName rejects empty values', () => {
  assert.throws(() => normalizeDisplayName(''), /nom/i);
  assert.throws(() => normalizeDisplayName('   '), /nom/i);
});

test('normalizeDisplayName rejects values longer than the max length', () => {
  assert.throws(() => normalizeDisplayName('A'.repeat(41)), /40/);
});

test('normalizeDisplayName rejects reserved words even when embedded', () => {
  for (const value of ['zwibba', 'Boutique Officiel Katanga', 'admin shaba', 'Support rapide']) {
    assert.throws(() => normalizeDisplayName(value), /réservé/i);
  }
});

test('normalizeDisplayName rejects profanity', () => {
  for (const value of ['Petit con', 'Vendeur merde']) {
    assert.throws(() => normalizeDisplayName(value), /nom/i);
  }
});

test('normalizeDisplayName returns the cleaned value for a valid name', () => {
  assert.equal(normalizeDisplayName('  Maison Kivu  '), 'Maison Kivu');
});
