import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(repoRoot, 'dist');
const contentPath = path.join(repoRoot, 'src/site/locales/fr-cd.mjs');

function buildSite(env = {}) {
  execFileSync('node', ['scripts/build.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });
}

function buildSiteWithContentPatch(patch) {
  const original = readFileSync(contentPath, 'utf8');

  try {
    writeFileSync(contentPath, patch(original));
    buildSite();
  } finally {
    writeFileSync(contentPath, original);
  }
}

async function withServer(run, env = {}) {
  buildSite();

  const port = 4311;
  const server = spawn('node', ['server.mjs'], {
    cwd: repoRoot,
    env: { ZWIBBA_API_BASE_URL: 'https://api.test', ...process.env, ...env, PORT: String(port) },
    stdio: 'ignore',
  });

  try {
    let ready = false;

    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        await delay(100);
      }
    }

    assert.equal(ready, true, 'server should become reachable');
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.kill('SIGTERM');
    await delay(150);
  }
}

async function withMockApi(handler, run) {
  const mockApi = createServer(handler);

  await new Promise((resolve) => {
    mockApi.listen(0, '127.0.0.1', resolve);
  });

  try {
    const { port } = mockApi.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      mockApi.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
}

test('build creates the full static site map required by the Zwibba website plan', () => {
  buildSite();

  const distEntries = new Set(readdirSync(distDir));
  const requiredPages = [
    'index.html',
    'App/index.html',
    'annonces/index.html',
    'ambassadeur/index.html',
    'a-propos/index.html',
    'contact/index.html',
    'r/index.html',
    'robots.txt',
    'sitemap.xml',
  ];

  for (const page of requiredPages) {
    assert.equal(existsSync(path.join(distDir, page)), true, `${page} should exist`);
  }

  assert.equal(distEntries.has('App'), true, 'App directory should exist');

  const listingRoot = path.join(distDir, 'annonce');
  const listingPages = readdirSync(listingRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert.ok(listingPages.length >= 6, 'expected at least six pre-rendered listing detail pages');
});

test('landing page ships the key conversion sections from the plan', () => {
  buildSite();

  const landing = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.match(landing, /Zwibba/i);
  assert.match(landing, /Vendez en un clic/i);
  assert.match(landing, /Google Play/i);
  assert.match(landing, /AppGallery/i);
  assert.match(landing, /IA|intelligence artificielle/i);
  assert.match(landing, /Lubumbashi/i);
});

test('app entry page mounts the app directly without a marketing CTA', () => {
  buildSite();

  const appEntry = readFileSync(path.join(distDir, 'App/index.html'), 'utf8');
  assert.doesNotMatch(appEntry, /Ouvrir l'app/);
  assert.doesNotMatch(appEntry, /href="#capture"/i);
  assert.match(appEntry, /class="app-shell__viewport"[^>]*data-app-root/i);
});

test('app entry page bootstraps the live API base URL for the browser seller flow', () => {
  buildSite();

  const appEntry = readFileSync(path.join(distDir, 'App/index.html'), 'utf8');
  assert.match(appEntry, /window\.ZWIBBA_API_BASE_URL/);
  assert.match(appEntry, /https:\/\/api-production-b1b58\.up\.railway\.app/);
});

test('app ships an installable PWA manifest and an offline service worker', () => {
  buildSite();

  const manifest = JSON.parse(
    readFileSync(path.join(distDir, 'manifest.webmanifest'), 'utf8'),
  );
  assert.equal(manifest.start_url, '/App/');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));

  assert.equal(existsSync(path.join(distDir, 'assets', 'brand', 'icon-192.png')), true);
  assert.equal(existsSync(path.join(distDir, 'assets', 'brand', 'icon-512.png')), true);

  const sw = readFileSync(path.join(distDir, 'App', 'sw.js'), 'utf8');
  assert.match(sw, /CACHE_VERSION = "zwibba-\d+"/);
  assert.doesNotMatch(sw, /__ZWIBBA_BUILD__/);

  const appEntry = readFileSync(path.join(distDir, 'App/index.html'), 'utf8');
  assert.match(appEntry, /<link rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(appEntry, /serviceWorker[\s\S]*register\('\/App\/sw\.js'/);
});

test('app shell exposes Open Graph tags with a raster default image', () => {
  buildSite();

  const appShell = readFileSync(path.join(distDir, 'App', 'index.html'), 'utf8');
  assert.match(appShell, /<meta property="og:image" content="https:\/\/zwibba\.com\/assets\/brand\/og-default\.png"/);
  assert.match(appShell, /<meta property="og:title"/);
  assert.match(appShell, /<meta property="og:description"/);
  assert.match(appShell, /<meta property="og:url" content="https:\/\/zwibba\.com\/App\/"/);
  assert.doesNotMatch(appShell, /<meta property="og:image" content="[^"]+\.svg"/);
});

test('app entry page renders a dedicated inner phone viewport for desktop scrolling', () => {
  buildSite();

  const appEntry = readFileSync(path.join(distDir, 'App/index.html'), 'utf8');
  assert.match(appEntry, /class="app-shell__viewport"[^>]*data-app-root/i);
});

test('site shell includes accessibility hooks and page-level structured data', () => {
  buildSite();

  const landing = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const browse = readFileSync(path.join(distDir, 'annonces/index.html'), 'utf8');
  const contact = readFileSync(path.join(distDir, 'contact/index.html'), 'utf8');

  assert.match(landing, /Aller au contenu/i);
  assert.match(landing, /id="main-content"/i);
  assert.match(browse, /CollectionPage/i);
  assert.match(contact, /ContactPage/i);
  assert.match(contact, /autocomplete="name"/i);
  assert.match(contact, /autocomplete="email"/i);
});

test('browse page exposes category discovery and marketplace filters', () => {
  buildSite();

  const browse = readFileSync(path.join(distDir, 'annonces/index.html'), 'utf8');
  assert.match(browse, /Alimentation/i);
  assert.match(browse, /Agriculture/i);
  assert.match(browse, /Bricolage ?\/ ?Construction/i);
  assert.match(browse, /[ÉE]cole ?\/ ?Universit[ée]/i);
  assert.match(browse, /Musique/i);
  assert.match(browse, /Sant[ée]/i);
  assert.match(browse, /Beaut[ée]/i);
  assert.match(browse, /Immobilier/i);
  assert.match(browse, /Services/i);
  assert.match(browse, /Emplois/i);
  assert.match(browse, /Sports/i);
  assert.match(browse, /V[ée]hicules/i);
  assert.match(browse, /T[ée]l[ée]phones/i);
  assert.match(browse, /Prix/i);
  assert.match(browse, /[ÉE]tat/i);
  assert.match(browse, /Plus r[ée]cents|Recent/i);
});

test('build includes static pages for the new seeded agriculture, construction, education, and sports listings', () => {
  buildSite();

  assert.equal(
    existsSync(path.join(distDir, 'annonce', 'pulverisateur-agricole-16l-lubumbashi', 'index.html')),
    true,
  );
  assert.equal(
    existsSync(path.join(distDir, 'annonce', 'lot-ciment-outils-chantier-lubumbashi', 'index.html')),
    true,
  );
  assert.equal(
    existsSync(path.join(distDir, 'annonce', 'pack-fournitures-scolaires-universitaires', 'index.html')),
    true,
  );
  assert.equal(
    existsSync(path.join(distDir, 'annonce', 'velo-fitness-loisir-lubumbashi', 'index.html')),
    true,
  );
});

test('listing detail pages include social metadata, contact actions, and safety tips', () => {
  buildSite();

  const listingRoot = path.join(distDir, 'annonce');
  const [firstListing] = readdirSync(listingRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const detail = readFileSync(path.join(listingRoot, firstListing.name, 'index.html'), 'utf8');

  assert.match(detail, /property="og:title"/i);
  assert.match(detail, /property="og:description"/i);
  assert.match(detail, /WhatsApp/i);
  assert.match(detail, /SMS/i);
  assert.match(detail, /Call|Appeler/i);
  assert.match(detail, /[ÉE]vitez de payer [àa] l(?:'|&#39;)avance/i);
});

test('seeded listing pages and browse cards use bundled raster images instead of generated svg placeholders', () => {
  buildSite();

  const browse = readFileSync(path.join(distDir, 'annonces/index.html'), 'utf8');
  const detail = readFileSync(
    path.join(distDir, 'annonce', 'samsung-galaxy-a54-neuf-lubumbashi', 'index.html'),
    'utf8',
  );

  assert.equal(
    existsSync(path.join(distDir, 'assets/listings/samsung-galaxy-a54-neuf-lubumbashi.jpg')),
    true,
    'expected bundled seeded listing image to be copied to dist',
  );
  assert.match(browse, /\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.jpg/);
  assert.match(detail, /\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.jpg/);
});

test('runtime serves referral short links through the dedicated referral page', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/r/ZWIB-A3K9`, { signal: AbortSignal.timeout(3000) });
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Transmission du code en cours/i);
    assert.match(body, /referral-code-output/i);
  });
});

test('runtime serves the standalone App route', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/App/`, { signal: AbortSignal.timeout(3000) });
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /data-app-root/i);
    assert.match(body, /Zwibba/i);
  });
});

test('runtime serves the lowercase app route', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/app`, {
      signal: AbortSignal.timeout(3000),
    });
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /data-app-root/i);
    assert.match(body, /Zwibba/i);
    assert.equal(response.headers.get('x-zwibba-canonical-route'), '/App/');
  });
});

test('runtime serves App module assets with a JavaScript MIME type', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/assets/app/services/draft-storage.mjs`, {
      signal: AbortSignal.timeout(3000),
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /application\/javascript/i);
    assert.match(response.headers.get('cache-control') || '', /no-cache/i);
  });
});

test('runtime renders per-listing OG tags for a non-static slug via the API', async () => {
  await withMockApi((request, response) => {
    if (request.url === '/listings/mon-annonce-test') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          slug: 'mon-annonce-test',
          title: 'Mon annonce test',
          priceAmount: 80000,
          priceCurrency: 'CDF',
          locationLabel: 'Gombe, Kinshasa',
          primaryImageUrl: 'https://cdn.example.com/listings/mon-annonce/photo.jpg',
          storyImageUrl: 'https://r2.example.com/listings/mon-annonce/story.png',
        }),
      );
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: 'Not found' }));
  }, async (mockBase) => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/annonce/mon-annonce-test/`, {
        signal: AbortSignal.timeout(3000),
      });
      const body = await response.text();

      assert.equal(response.status, 200);
      assert.match(body, /property="og:image" content="https:\/\/r2\.example\.com\/listings\/mon-annonce\/story\.png"/);
      assert.match(body, /80\s?000 CDF/);
      assert.match(body, /Gombe, Kinshasa/);
      assert.match(body, /#listing\/mon-annonce-test/);
    }, { ZWIBBA_API_BASE_URL: mockBase });
  });
});

test('runtime falls back to brand og-default.png when the API has no such listing', async () => {
  await withMockApi((request, response) => {
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: `No listing for ${request.url}` }));
  }, async (mockBase) => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/annonce/inconnu-xyz/`, {
        signal: AbortSignal.timeout(3000),
      });
      const body = await response.text();

      assert.equal(response.status, 200);
      assert.match(body, /assets\/brand\/og-default\.png/);
    }, { ZWIBBA_API_BASE_URL: mockBase });
  });
});

test('build can inject Plausible analytics when configured', () => {
  buildSite({
    PLAUSIBLE_DOMAIN: 'zwibba.com',
    PLAUSIBLE_SRC: 'https://plausible.io/js/script.js',
  });

  const landing = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  assert.match(landing, /plausible\.io\/js\/script\.js/i);
  assert.match(landing, /data-domain="zwibba\.com"/i);
});

test('build.mjs uses storyImageUrl as og:image when available', () => {
  const storyImageUrl = 'https://r2.example.com/listings/story-test/story.png';

  buildSiteWithContentPatch((content) =>
    content.replace(
      "slug: 'samsung-galaxy-a54-neuf-lubumbashi',",
      `slug: 'samsung-galaxy-a54-neuf-lubumbashi',\n    storyImageUrl: '${storyImageUrl}',`,
    ),
  );

  const detail = readFileSync(
    path.join(distDir, 'annonce', 'samsung-galaxy-a54-neuf-lubumbashi', 'index.html'),
    'utf8',
  );

  assert.match(detail, new RegExp(`<meta property="og:image" content="${storyImageUrl}" />`));
  assert.match(detail, /<meta property="og:image:width" content="1080" \/>/);
  assert.match(detail, /<meta property="og:image:height" content="1920" \/>/);
  assert.match(detail, /<meta property="og:title" content="Je vends sur Zwibba ! Samsung Galaxy A54 neuf sous emballage" \/>/);
  assert.match(detail, /<meta property="product:price:amount" content="450000" \/>/);
  assert.match(detail, /<meta property="product:price:currency" content="CDF" \/>/);
});

test('build.mjs falls back to primaryImageUrl when storyImageUrl is null', () => {
  buildSite();

  const detail = readFileSync(
    path.join(distDir, 'annonce', 'samsung-galaxy-a54-neuf-lubumbashi', 'index.html'),
    'utf8',
  );

  assert.match(
    detail,
    /<meta property="og:image" content="https:\/\/zwibba\.com\/assets\/listings\/samsung-galaxy-a54-neuf-lubumbashi\.jpg" \/>/,
  );
  assert.doesNotMatch(detail, /property="og:image:width"/);
  assert.doesNotMatch(detail, /property="og:image:height"/);
  assert.match(detail, /<meta property="og:title" content="Samsung Galaxy A54 neuf sous emballage \| Zwibba" \/>/);
  assert.doesNotMatch(detail, /Je vends sur Zwibba ! Samsung Galaxy A54/);
});


test('les compteurs de catégories reflètent les données', () => {
  buildSite();

  const browse = readFileSync(path.join(distDir, 'annonces', 'index.html'), 'utf8');
  const landing = readFileSync(path.join(distDir, 'index.html'), 'utf8');
  const locale = readFileSync(contentPath, 'utf8');

  assert.doesNotMatch(locale, /10 catégories|Dix univers/);
  assert.doesNotMatch(browse, /10 catégories/i);
  assert.doesNotMatch(landing, /Dix univers/);
  assert.doesNotMatch(landing, />Booste</);
});
