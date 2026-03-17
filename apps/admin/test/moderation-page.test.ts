import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import * as adminMain from '../src/main';

test('admin moderation shell renders api-shaped queue items with outcome labels', async () => {
  const html = await adminMain.renderModerationShell(async () => {
    return {
      items: [
        {
          id: 'listing-1',
          listingTitle: 'Samsung Galaxy A54 128 Go',
          reasonSummary: 'Photo principale à confirmer',
          sellerPhoneNumber: '+243990000001',
          status: 'pending_manual_review',
        },
        {
          id: 'listing-2',
          listingTitle: 'Toyota Hilux 2019 4x4',
          reasonSummary: 'Documents véhicule à vérifier',
          sellerPhoneNumber: '+243990000002',
          status: 'blocked_needs_fix',
        },
      ],
    };
  });

  assert.match(html, /Samsung Galaxy A54 128 Go/);
  assert.match(html, /\+243990000001/);
  assert.match(html, /pending manual review/i);
  assert.match(html, /Photo principale à confirmer/);
  assert.match(html, /Toyota Hilux 2019 4x4/);
  assert.match(html, /blocked needs fix/i);
});

test('admin service serves a protected moderation page over http', async (t) => {
  const createModerationServer = (adminMain as Record<string, unknown>)[
    'createModerationServer'
  ];

  assert.equal(typeof createModerationServer, 'function');

  if (typeof createModerationServer != 'function') {
    return;
  }

  const server = createModerationServer({
    queueLoader: async () => ({
      items: [
        {
          id: 'listing-1',
          listingTitle: 'Samsung Galaxy A54 128 Go',
          reasonSummary: 'Photo principale à confirmer',
          sellerPhoneNumber: '+243990000001',
          status: 'pending_manual_review',
        },
      ],
    }),
    sharedSecret: 'zwibba-admin-secret',
  }) as {
    close(callback: () => void): void;
    listen(port: number, host: string, callback: () => void): void;
    address(): AddressInfo | null;
  };

  t.after(async () => {
    await new Promise<void>((resolve) => {
      server.close(resolve);
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  assert.ok(address);

  const unauthorizedResponse = await fetch(
    `http://127.0.0.1:${address.port}/moderation`,
  );
  assert.equal(unauthorizedResponse.status, 401);

  const authorizedResponse = await fetch(
    `http://127.0.0.1:${address.port}/moderation`,
    {
      headers: {
        'x-zwibba-admin-secret': 'zwibba-admin-secret',
      },
    },
  );

  assert.equal(authorizedResponse.status, 200);

  const html = await authorizedResponse.text();
  assert.match(html, /Pending moderation queue/i);
  assert.match(html, /Samsung Galaxy A54 128 Go/);
});
