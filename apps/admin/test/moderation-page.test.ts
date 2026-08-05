import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

import * as adminMain from '../src/main';
import { renderModerationPage } from '../src/moderation/moderation-page';

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
  assert.match(html, /Approuver/);
  assert.match(html, /Bloquer/);
  assert.match(html, /name="reasonSummary"/);
});

test('renderModerationPage renders CD and BE market tabs with the active one marked', () => {
  const cdHtml = renderModerationPage({ items: [] }, 'CD');

  assert.match(cdHtml, /RDC/);
  assert.match(cdHtml, /Belgique/);
  assert.match(cdHtml, /href="\/moderation\?countryCode=CD"/);
  assert.match(cdHtml, /href="\/moderation\?countryCode=BE"/);

  const beHtml = renderModerationPage({ items: [] }, 'BE');

  assert.match(beHtml, /RDC/);
  assert.match(beHtml, /Belgique/);
  assert.match(beHtml, /href="\/moderation\?countryCode=CD"/);
  assert.match(beHtml, /href="\/moderation\?countryCode=BE"/);

  // The active tab must be visually distinguishable from the inactive one.
  assert.notEqual(
    cdHtml.match(/<a[^>]*href="\/moderation\?countryCode=CD"[^>]*>/)?.[0],
    beHtml.match(/<a[^>]*href="\/moderation\?countryCode=CD"[^>]*>/)?.[0],
  );
  assert.notEqual(
    cdHtml.match(/<a[^>]*href="\/moderation\?countryCode=BE"[^>]*>/)?.[0],
    beHtml.match(/<a[^>]*href="\/moderation\?countryCode=BE"[^>]*>/)?.[0],
  );
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

test('admin service forwards approve and block actions to the API with the shared secret', async (t) => {
  const apiRequests: Array<{
    body: string;
    method: string;
    url: string;
  }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    apiRequests.push({
      body: typeof init?.body === 'string' ? init.body : '',
      method: init?.method ?? 'GET',
      url: String(url),
    });

    if (String(url).endsWith('/moderation/queue')) {
      return new Response(
        JSON.stringify({
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
        {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        id: 'listing-1',
        reasonSummary: 'Annonce approuvée',
        status: 'approved',
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
      },
    );
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const createModerationServer = (adminMain as Record<string, unknown>)[
    'createModerationServer'
  ];

  assert.equal(typeof createModerationServer, 'function');

  if (typeof createModerationServer != 'function') {
    return;
  }

  const server = createModerationServer({
    apiBaseUrl: 'https://api.example.test',
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

  const approveResponse = await fetch(
    `http://127.0.0.1:${address.port}/moderation/listing-1/approve`,
    {
      method: 'POST',
      headers: {
        'x-zwibba-admin-secret': 'zwibba-admin-secret',
      },
      redirect: 'manual',
    },
  );

  assert.equal([200, 303].includes(approveResponse.status), true);
  assert.equal(apiRequests.some((request) => request.url.endsWith('/moderation/listing-1/approve')), true);

  const blockResponse = await fetch(
    `http://127.0.0.1:${address.port}/moderation/listing-1/block`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-zwibba-admin-secret': 'zwibba-admin-secret',
      },
      body: new URLSearchParams({
        reasonSummary: 'Photos insuffisantes',
      }),
      redirect: 'manual',
    },
  );

  assert.equal([200, 303].includes(blockResponse.status), true);
  assert.equal(
    apiRequests.some((request) => {
      return request.url.endsWith('/moderation/listing-1/block');
    }),
    true,
  );
});

test('admin moderation page propagates the selected countryCode to the API queue fetch and marks the active tab', async (t) => {
  const apiRequests: Array<{ url: string }> = [];
  const originalFetch = globalThis.fetch;
  // Only intercept calls to the mocked API base; anything else (in particular
  // the test's own client request to the local admin server) must go over
  // the real network, otherwise the server-side forwarding never happens.
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const urlString = String(url);

    if (urlString.startsWith('https://api.example.test')) {
      apiRequests.push({ url: urlString });

      return new Response(
        JSON.stringify({ items: [] }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json; charset=utf-8',
          },
        },
      );
    }

    return originalFetch(url as string, init);
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const createModerationServer = (adminMain as Record<string, unknown>)[
    'createModerationServer'
  ];

  assert.equal(typeof createModerationServer, 'function');

  if (typeof createModerationServer != 'function') {
    return;
  }

  const server = createModerationServer({
    apiBaseUrl: 'https://api.example.test',
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

  const beResponse = await fetch(
    `http://127.0.0.1:${address.port}/moderation?countryCode=BE`,
    {
      headers: {
        'x-zwibba-admin-secret': 'zwibba-admin-secret',
      },
    },
  );
  assert.equal(beResponse.status, 200);
  const beHtml = await beResponse.text();

  assert.equal(
    apiRequests.some((request) => request.url === 'https://api.example.test/moderation/queue?countryCode=BE'),
    true,
  );
  assert.match(beHtml, /href="\/moderation\?countryCode=CD"/);
  assert.match(beHtml, /href="\/moderation\?countryCode=BE"/);

  const cdResponse = await fetch(
    `http://127.0.0.1:${address.port}/moderation`,
    {
      headers: {
        'x-zwibba-admin-secret': 'zwibba-admin-secret',
      },
    },
  );
  assert.equal(cdResponse.status, 200);
  const cdHtml = await cdResponse.text();

  assert.equal(
    apiRequests.some((request) => request.url === 'https://api.example.test/moderation/queue?countryCode=CD'),
    true,
  );

  // The active tab markup should differ between the CD default view and the BE view.
  assert.notEqual(
    cdHtml.match(/<a[^>]*href="\/moderation\?countryCode=BE"[^>]*>/)?.[0],
    beHtml.match(/<a[^>]*href="\/moderation\?countryCode=BE"[^>]*>/)?.[0],
  );
});
