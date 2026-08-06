import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildListingOgTags } from './shared/listing-og.mjs';
import { resolveApiBaseUrl } from './shared/api-base-url.mjs';
import { resolveGeoCountry, buildGeoCookie } from './shared/geo-country.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 3003);
const publicDomain = process.env.RAILWAY_PUBLIC_DOMAIN || '';
const apiBaseUrl = resolveApiBaseUrl(process.env);

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

const noCacheExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
]);

function send(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, headers);
  if (response.req.method !== 'HEAD') {
    response.end(body);
    return;
  }

  response.end();
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
    send(response, 404, 'Not Found', { 'Content-Type': 'text/plain; charset=utf-8' });
    return;
  }

  try {
    const body = readFileSync(filePath);
    const extension = path.extname(filePath);
    const contentType = contentTypes[extension] || 'application/octet-stream';
    const cacheControl = noCacheExtensions.has(extension) ? 'no-cache' : 'public, max-age=86400';

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
