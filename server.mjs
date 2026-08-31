import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildListingOgTags } from './shared/listing-og.mjs';
import { resolveApiBaseUrl } from './shared/api-base-url.mjs';
import { resolveGeoCountry, buildGeoCookie } from './shared/geo-country.mjs';
import {
  extractEmptyStateTemplate,
  injectLiveListings,
  parseStartMarkers,
  renderLiveListingCards,
} from './shared/live-listings.mjs';
import * as frCd from './src/site/locales/fr-cd.mjs';
import * as frBe from './src/site/locales/fr-be.mjs';
import * as nlBe from './src/site/locales/nl-be.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = process.env.ZWIBBA_DIST_DIR
  ? path.resolve(__dirname, process.env.ZWIBBA_DIST_DIR)
  : path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 3003);
const publicDomain = process.env.RAILWAY_PUBLIC_DOMAIN || '';
const apiBaseUrl = resolveApiBaseUrl(process.env);
const liveListingsCache = new Map();
const liveListingsTtlMs = 60_000;
const categoriesByLocale = {
  'fr-CD': frCd.categories,
  'fr-BE': frBe.categories,
  'nl-BE': nlBe.categories,
};

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

// Les scripts ne sont pas listés ici : l'app importe ~75 modules ES imbriqués,
// dont les URL ne portent pas le `?v=` du point d'entrée. En no-cache, chacun
// repartait jusqu'à l'origine à chaque ouverture. Ils retombent donc sur le
// `max-age=300` par défaut ; le HTML et le service worker, traités plus haut,
// restent en no-cache et continuent de piloter la fraîcheur des déploiements.
const noCacheAssetExtensions = new Set(['.css', '.json']);

function send(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, headers);
  if (response.req.method !== 'HEAD') {
    response.end(body);
    return;
  }

  response.end();
}

function isServiceWorkerPath(urlPath) {
  const normalizedPath = urlPath.toLowerCase();
  return normalizedPath.includes('service-worker') || normalizedPath.endsWith('/sw.js');
}

function isNavigationRequest(request, extension) {
  return extension === '.html' || (!extension && String(request.headers.accept || '').includes('text/html'));
}

function cacheControlForRequest(request, url, extension) {
  if (isNavigationRequest(request, extension) || isServiceWorkerPath(url.pathname)) {
    return 'no-cache';
  }

  if (url.searchParams.has('v')) {
    return 'public, max-age=31536000, immutable';
  }

  if (noCacheAssetExtensions.has(extension)) {
    return 'no-cache';
  }

  return 'public, max-age=300';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function resolveBaseUrl(requestUrl) {
  if (publicDomain) {
    return `https://${publicDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  }

  return requestUrl.origin;
}

function buildFallbackListing(slug) {
  return {
    slug,
    title: 'Annonce Zwibba',
    priceAmount: null,
    priceCurrency: 'CDF',
    locationLabel: 'RDC',
    primaryImageUrl: null,
    storyImageUrl: null,
  };
}

async function fetchListing(slug) {
  const response = await fetch(`${apiBaseUrl}/listings/${encodeURIComponent(slug)}`, {
    signal: AbortSignal.timeout(2500),
  });

  if (!response.ok) {
    throw new Error(`Listing API returned ${response.status}`);
  }

  return response.json();
}

async function fetchBrowseFeed(market) {
  const cached = liveListingsCache.get(market);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < liveListingsTtlMs) {
    return cached.items;
  }

  try {
    const url = new URL('/listings', apiBaseUrl);
    url.searchParams.set('countryCode', market);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(2500),
    });

    if (!response.ok) {
      throw new Error(`Listings API returned ${response.status}`);
    }

    const body = await response.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    liveListingsCache.set(market, { items, fetchedAt: now });
    return items;
  } catch (error) {
    if (cached) {
      console.warn(`Zwibba live listings stale cache for ${market}: ${error.message}`);
      return cached.items;
    }

    throw error;
  }
}

async function injectLiveListingsIntoHtml(body) {
  const markers = parseStartMarkers(body);

  if (markers.length === 0) {
    return body;
  }

  const gridMarker = markers.find((marker) => marker.slot === 'grid') || markers[0];
  const items = await fetchBrowseFeed(gridMarker.market);
  const grid =
    items.length > 0
      ? renderLiveListingCards({
          items,
          categories: categoriesByLocale[gridMarker.locale] || [],
        })
      : extractEmptyStateTemplate(body) || '';

  let injected = injectLiveListings(body, {
    featured: '',
    grid,
  });
  injected = injected.replace(
    /<script type="application\/ld\+json">(?=[\s\S]*?"@type":"CollectionPage")[\s\S]*?<\/script>/,
    '',
  );

  if (items.length > 0) {
    return injected.replace(
      /<template\s+data-live-listings-empty>[\s\S]*?<\/template>/,
      '<template data-live-listings-empty></template>',
    );
  }

  return injected;
}

function renderDynamicListingPage({ baseUrl, listing, slug }) {
  const appRoute = `/App/#listing/${slug}`;
  const ogTags = buildListingOgTags({ listing, baseUrl });
  const canonicalUrl = new URL(`/annonce/${slug}/`, baseUrl).toString();
  const title = `${listing.title || 'Annonce Zwibba'} | Zwibba`;

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    ${ogTags}
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <script>location.replace(${JSON.stringify(appRoute)});</script>
  </head>
  <body>
    <noscript><a href="/App/">Ouvrir l'application Zwibba</a></noscript>
  </body>
</html>`;
}

function resolveFile(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const cleanPath = decodedPath.replace(/\/+/g, '/');

  if (cleanPath === '/app' || cleanPath === '/app/') {
    return {
      canonicalRoute: '/App/',
      filePath: path.join(distDir, 'App', 'index.html'),
    };
  }

  if (cleanPath.startsWith('/r/') && cleanPath !== '/r/' && !path.extname(cleanPath)) {
    return { canonicalRoute: null, filePath: path.join(distDir, 'r', 'index.html') };
  }

  if (cleanPath === '/') {
    return { canonicalRoute: null, filePath: path.join(distDir, 'index.html') };
  }

  const relativePath = cleanPath.replace(/^\/+/, '');
  const directFile = path.join(distDir, relativePath);

  if (existsSync(directFile) && statSync(directFile).isFile()) {
    return { canonicalRoute: null, filePath: directFile };
  }

  if (!path.extname(relativePath)) {
    const nestedIndex = path.join(distDir, relativePath, 'index.html');
    if (existsSync(nestedIndex)) {
      return { canonicalRoute: null, filePath: nestedIndex };
    }

    const htmlFile = `${directFile}.html`;
    if (existsSync(htmlFile)) {
      return { canonicalRoute: null, filePath: htmlFile };
    }
  }

  return null;
}

createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const resolvedFile = resolveFile(url.pathname);
  const filePath = resolvedFile?.filePath;
  const dynamicListingMatch = url.pathname.match(/^\/annonce\/([^/]+)\/?$/);
  const geoCountry = resolveGeoCountry(request.headers);

  if ((!filePath || !filePath.startsWith(distDir)) && dynamicListingMatch) {
    const slug = decodeURIComponent(dynamicListingMatch[1]);
    const baseUrl = resolveBaseUrl(url);
    let listing = buildFallbackListing(slug);

    try {
      listing = await fetchListing(slug);
    } catch (error) {
      console.warn(`Zwibba listing OG fallback for ${slug}: ${error.message}`);
    }

    const body = renderDynamicListingPage({ baseUrl, listing: { ...listing, slug }, slug });

    if (geoCountry) {
      response.setHeader('Set-Cookie', buildGeoCookie(geoCountry));
    }

    send(response, 200, body, {
      'Cache-Control': 'no-cache',
      'Content-Length': Buffer.byteLength(body),
      'Content-Type': 'text/html; charset=utf-8',
    });
    return;
  }

  if (!filePath || !filePath.startsWith(distDir)) {
    // Legacy share links used the plural /annonces/<slug>; the per-listing OG
    // page lives at /annonce/<slug>/.
    const pluralListingMatch = url.pathname.match(/^\/annonces\/([^/]+)\/?$/);

    if (pluralListingMatch) {
      send(response, 301, '', {
        Location: `/annonce/${pluralListingMatch[1]}/`,
      });
      return;
    }

    send(response, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  try {
    const rawBody = readFileSync(filePath);
    const extension = path.extname(filePath);
    const contentType = contentTypes[extension] || 'application/octet-stream';
    const cacheControl = cacheControlForRequest(request, url, extension);
    let body = rawBody;

    if (extension === '.html') {
      const html = rawBody.toString('utf8');
      try {
        const injectedHtml = await injectLiveListingsIntoHtml(html);
        body = Buffer.from(injectedHtml);
      } catch (error) {
        console.warn(`Zwibba live listings static fallback for ${filePath}: ${error.message}`);
      }
    }

    if (extension === '.html' && geoCountry) {
      response.setHeader('Set-Cookie', buildGeoCookie(geoCountry));
    }

    send(response, 200, body, {
      'Cache-Control': cacheControl,
      'Content-Length': body.length,
      'Content-Type': contentType,
      ...(resolvedFile?.canonicalRoute ? { 'X-Zwibba-Canonical-Route': resolvedFile.canonicalRoute } : {}),
    });
  } catch {
    send(response, 500, 'Internal Server Error', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`Zwibba website server running on http://127.0.0.1:${port}`);
  if (publicDomain) {
    console.log(`Zwibba website public URL https://${publicDomain}`);
  }
});
