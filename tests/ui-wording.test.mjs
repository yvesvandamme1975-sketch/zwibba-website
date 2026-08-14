import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = [
  'App/features/home/home-screen.mjs',
  'App/features/home/buy-screen.mjs',
  'App/features/auth/welcome-screen.mjs',
  'App/features/wallet/wallet-screen.mjs',
  'App/features/profile/profile-screen.mjs',
  'App/features/post/capture-screen.mjs',
];

test('aucun jargon interne dans les écrans utilisateur', () => {
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    assert.doesNotMatch(src, /Seller-first|Live beta|portefeuille test|solde bêta|vraie photo/i, file);
  }
});
