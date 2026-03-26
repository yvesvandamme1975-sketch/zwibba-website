import assert from 'node:assert/strict';
import test from 'node:test';

import { renderWalletScreen } from '../App/features/wallet/wallet-screen.mjs';

test('wallet screen renders the seeded beta credit and boost debit history', () => {
  const html = renderWalletScreen({
    state: 'ready',
    wallet: {
      balanceCdf: 15000,
      transactions: [
        {
          amountCdf: 30000,
          createdAtLabel: 'Aujourd’hui',
          id: 'wallet_tx_1',
          kind: 'credit',
          label: 'Crédit bêta Zwibba',
        },
        {
          amountCdf: -15000,
          createdAtLabel: 'Aujourd’hui',
          id: 'wallet_tx_2',
          kind: 'debit',
          label: 'Boost annonce Samsung Galaxy A54',
        },
      ],
    },
  });

  assert.match(html, /Mon portefeuille/);
  assert.match(html, /30 000 CDF|30\u202f000 CDF/);
  assert.match(html, /Crédit bêta Zwibba/);
  assert.match(html, /Boost annonce Samsung Galaxy A54/);
});

test('wallet screen shows a verification prompt without a session', () => {
  const html = renderWalletScreen({
    state: 'locked',
  });

  assert.match(html, /Vérifiez votre numéro/i);
  assert.match(html, /href="#auth-welcome"/);
});
