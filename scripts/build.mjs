import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import {
  aboutValues,
  ambassadorChannels,
  categories,
  faqs,
  featureSteps,
  listings,
  platformHighlights,
  site,
  supportTopics,
  testimonials,
} from '../src/site/content.mjs';
import * as frCd from '../src/site/locales/fr-cd.mjs';
import { resolveSeededListingImage } from '../shared/listing-images.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const buildLockDir = path.join(repoRoot, '.build-lock');
const distDir = path.join(repoRoot, 'dist');
const assetsDir = path.join(distDir, 'assets');
const appApiBaseUrl =
  process.env.ZWIBBA_API_BASE_URL || 'https://api-production-b1b58.up.railway.app';
const plausibleDomain = process.env.PLAUSIBLE_DOMAIN || '';
const plausibleSrc = process.env.PLAUSIBLE_SRC || 'https://plausible.io/js/script.js';
const supportWhatsAppCd = process.env.ZWIBBA_SUPPORT_WHATSAPP_CD ?? '';
const supportWhatsAppBe = process.env.ZWIBBA_SUPPORT_WHATSAPP_BE ?? '';

function whatsappDigits(phoneNumber) {
  return typeof phoneNumber === 'string' ? phoneNumber.replace(/\D/g, '') : '';
}

function conditionCode(label) {
  return String(label)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const iconPaths = {
  menu:
    '<path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
  close:
    '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
  arrow:
    '<path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  mobile:
    '<rect x="7" y="3.5" width="10" height="17" rx="2.5" stroke="currentColor" stroke-width="1.6" fill="none"/><circle cx="12" cy="17.4" r="1" fill="currentColor"/>',
  maison:
    '<path d="M4 11.5L12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" fill="currentColor"/>',
  route:
    '<path d="M9 3h6l-1.2 5H15l1.2 5h-1.2l1.5 8h-9l1.5-8H7.8L9 8H10.2z" fill="currentColor"/>',
  panier:
    '<path d="M7 9l2-4m8 4-2-4M5.5 9h13l-1 9a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  feuille:
    '<path d="M18 4c-5 1-8 4-9 9m0 0c-1 2.3-1.2 4.5-1.1 7M9 13c2 .6 4.6.3 7-1 3.6-1.9 5-6.2 5-8-1.8 0-6 .8-8.9 3.6C10.5 9 9.7 11 9 13z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  eclair:
    '<path d="M13.5 2.5L5 13h5l-1 8.5L17.5 11h-5z" fill="currentColor"/>',
  etoile:
    '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20l1-6.1L3.2 9.7l6.1-.9z" fill="currentColor"/>',
  canape:
    '<path d="M5 12.5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3V18h-2v-1.5H7V18H5zm2 2h10v-2a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1z" fill="currentColor"/>',
  briefcase:
    '<path d="M8 6.5V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1.5H20a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-4.2v-1.4H8.2V16H4a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1zm2 0h4V6h-4zm-5 3v4.5h14V9.5z" fill="currentColor"/>',
  ballon:
    '<path d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm0 0 2.8 3.2-1 3.7H10.2l-1-3.7zm-5 5.2 3-.5 1.2 3.8-2.5 2.2-3-.7A6.8 6.8 0 0 1 7 8.7zm.6 7.3 2.7.6 1.1 3.2a6.8 6.8 0 0 1-3.8-3.8zm8.8 3.8 1.1-3.2 2.7-.6a6.8 6.8 0 0 1-3.8 3.8zm4.4-6.5-3 .7-2.5-2.2 1.2-3.8 3 .5a6.8 6.8 0 0 1 1.3 4.8z" fill="currentColor"/>',
  share:
    '<path d="M15 8a3 3 0 1 0-2.8-4h-.4A3 3 0 0 0 9 7c0 .2 0 .5.1.7l-4 2.2a3 3 0 1 0 0 4.2l4 2.2A3 3 0 1 0 12 15c0-.2 0-.5-.1-.7l4-2.2A3 3 0 0 0 15 8z" fill="currentColor"/>',
  shield:
    '<path d="M12 3l6 2.3v5.2c0 4.2-2.5 7.8-6 9.5-3.5-1.7-6-5.3-6-9.5V5.3z" fill="currentColor"/>',
  map:
    '<path d="M4 5.5l5-2 6 2 5-2V18.5l-5 2-6-2-5 2zm5-2v13l6 2v-13zm6 2v13l5-2v-13z" fill="currentColor"/>',
  chat:
    '<path d="M5 5.5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3v-3H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" fill="currentColor"/>',
  spark:
    '<path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6zM18.5 14l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9zM6.2 14.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7z" fill="currentColor"/>',
  mail:
    '<path d="M4 6.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm0 1.8 8 5.4 8-5.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  phone:
    '<path d="M7.4 4.2l2.8 2a1.8 1.8 0 0 1 .6 2.2l-.7 1.5a13.2 13.2 0 0 0 4.1 4.1l1.5-.7a1.8 1.8 0 0 1 2.2.6l2 2.8a1.8 1.8 0 0 1-.2 2.3l-1.4 1.4a2.8 2.8 0 0 1-2.7.7c-3.1-.8-6-2.8-8.5-5.3S2.5 10.1 1.7 7a2.8 2.8 0 0 1 .7-2.7l1.4-1.4a1.8 1.8 0 0 1 2.3-.2z" fill="currentColor"/>',
};

function ensureDir(target) {
  mkdirSync(target, { recursive: true });
}

function writeText(target, content) {
  ensureDir(path.dirname(target));
  writeFileSync(target, content);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function serializeJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function formatPrice(currentSite, value) {
  return `${new Intl.NumberFormat(currentSite.priceLocale).format(value)} ${currentSite.currency}`;
}

function resolveUrl(currentSite, relativePath) {
  return new URL(relativePath, currentSite.baseUrl).toString();
}

function icon(name, className = '') {
  const markup = iconPaths[name.toLowerCase()] || iconPaths.spark;
  const classAttr = className ? ` class="${className}"` : '';
  return `<svg${classAttr} viewBox="0 0 24 24" aria-hidden="true">${markup}</svg>`;
}

function buildListingImage(currentSite, listing) {
  const [primary, secondary] = listing.accent;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="800" viewBox="0 0 1200 800" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="800" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${primary}"/>
      <stop offset="1" stop-color="${secondary}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(920 180) rotate(120) scale(420 420)">
      <stop stop-color="#FFFFFF" stop-opacity="0.24"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="800" rx="48" fill="#111214"/>
  <rect x="30" y="30" width="1140" height="740" rx="42" fill="url(#bg)"/>
  <rect x="30" y="30" width="1140" height="740" rx="42" fill="url(#glow)"/>
  <g opacity="0.2">
    <circle cx="1040" cy="660" r="180" fill="#FFFFFF"/>
    <circle cx="180" cy="160" r="110" fill="#FFFFFF"/>
  </g>
  <rect x="84" y="92" width="216" height="44" rx="22" fill="rgba(17,18,20,0.24)"/>
  <text x="116" y="122" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#F8FAF9">Zwibba</text>
  <text x="84" y="268" font-family="Arial, sans-serif" font-size="72" font-weight="700" fill="#FFFFFF">${escapeHtml(
    listing.title,
  )}</text>
  <text x="84" y="340" font-family="Arial, sans-serif" font-size="34" font-weight="400" fill="rgba(255,255,255,0.88)">${escapeHtml(
    listing.categoryLabel,
  )} · ${escapeHtml(listing.neighborhood)}, ${escapeHtml(listing.city)}</text>
  <text x="84" y="432" font-family="Arial, sans-serif" font-size="60" font-weight="700" fill="#E9FFE9">${escapeHtml(
    formatPrice(currentSite, listing.priceCdf),
  )}</text>
  <rect x="84" y="512" width="420" height="160" rx="28" fill="rgba(17,18,20,0.22)"/>
  <text x="116" y="572" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#FFFFFF">Vendez en un clic</text>
  <text x="116" y="616" font-family="Arial, sans-serif" font-size="24" font-weight="400" fill="rgba(255,255,255,0.88)">Photo → IA → annonce prête</text>
  <text x="116" y="652" font-family="Arial, sans-serif" font-size="24" font-weight="400" fill="rgba(255,255,255,0.88)">Contact protégé dans l'application</text>
  <circle cx="970" cy="304" r="130" fill="rgba(17,18,20,0.22)"/>
  <text x="970" y="328" text-anchor="middle" font-family="Arial, sans-serif" font-size="118" font-weight="700" fill="#FFFFFF">${escapeHtml(
    listing.icon.slice(0, 1),
  )}</text>
</svg>`;
}

function resolveListingImageAsset(listing) {
  return resolveSeededListingImage(listing.slug)?.src || `/assets/listings/${listing.slug}.svg`;
}

function renderStoreButtons(currentSite, extraClass = '') {
  return currentSite.stores
    .map(
      (store) => `
        <a class="store-button ${extraClass}" href="${store.href}" target="_blank" rel="noreferrer" data-store-link>
          <span class="store-button__eyebrow">${escapeHtml(store.eyebrow)}</span>
          <span class="store-button__label">${escapeHtml(store.label)}</span>
          <span class="store-button__note">${escapeHtml(store.note)}</span>
        </a>
      `,
    )
    .join('');
}

function renderNav(content, currentPath) {
  const { site, ui } = content;
  const links = site.nav
    .map(({ href, label }) => {
      const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href));
      return `<a class="nav-link${isActive ? ' is-active' : ''}" href="${href}">${escapeHtml(label)}</a>`;
    })
    .join('');

  return `
    <header class="site-header">
      <div class="site-header__inner">
        <a class="brandmark" href="/" aria-label="${ui.nav.homeAriaLabel}">
          <img src="/assets/brand/logo-zwibba.svg" alt="Zwibba" width="160" height="113" />
        </a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
          <span class="menu-toggle__icon menu-toggle__icon--open">${icon('menu')}</span>
          <span class="menu-toggle__icon menu-toggle__icon--close">${icon('close')}</span>
          <span class="sr-only">${ui.nav.menuLabel}</span>
        </button>
        <nav class="site-nav" id="site-nav" data-open="false">
          ${links}
          <a class="button button--ghost" href="/annonces/">${ui.nav.explore}</a>
          <a class="button button--primary" href="/ambassadeur/">${ui.nav.download}</a>
        </nav>
      </div>
    </header>
  `;
}

function renderFooter(content) {
  const { site, ui } = content;
  const footerLinks = site.nav
    .map((item) => `<a href="${item.href}">${escapeHtml(item.label)}</a>`)
    .join('');

  return `
    <footer class="site-footer">
      <div class="site-footer__grid">
        <div>
          <img class="site-footer__logo" src="/assets/brand/logo-zwibba.svg" alt="Zwibba" width="178" height="126" />
          <p class="site-footer__copy">${escapeHtml(site.description)}</p>
        </div>
        <div>
          <h2 class="site-footer__title">${ui.nav.footerNavTitle}</h2>
          <div class="site-footer__links">${footerLinks}</div>
        </div>
        <div>
          <h2 class="site-footer__title">${ui.nav.footerStoresTitle}</h2>
          <div class="store-row store-row--footer">${renderStoreButtons(site, 'store-button--compact')}</div>
        </div>
      </div>
      <div class="site-footer__meta">
        <span>${escapeHtml(site.marketLabel)}</span>
        <span>${ui.nav.footerTagline}</span>
      </div>
    </footer>
  `;
}

function renderManifest() {
  return JSON.stringify(
    {
      name: 'Zwibba',
      short_name: 'Zwibba',
      description:
        'Publiez, découvrez et partagez des annonces à Lubumbashi, même hors connexion.',
      lang: 'fr',
      dir: 'ltr',
      start_url: '/App/',
      scope: '/App/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#1E1E20',
      theme_color: '#1E1E20',
      icons: [
        { src: '/assets/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/assets/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    null,
    2,
  );
}

function renderAppPage() {
  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zwibba App</title>
    <meta name="description" content="Bêta web Zwibba pour publier, découvrir et partager des annonces en direct." />
    <meta name="theme-color" content="#1E1E20" />
    <meta name="color-scheme" content="dark" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${site.locale}" />
    <meta property="og:site_name" content="${site.name}" />
    <meta property="og:title" content="Zwibba App" />
    <meta property="og:description" content="Bêta web Zwibba pour publier, découvrir et partager des annonces en direct." />
    <meta property="og:url" content="${resolveUrl(site, '/App/')}" />
    <meta property="og:image" content="${resolveUrl(site, '/assets/brand/og-default.png')}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Zwibba App" />
    <meta name="twitter:description" content="Bêta web Zwibba pour publier, découvrir et partager des annonces en direct." />
    <meta name="twitter:image" content="${resolveUrl(site, '/assets/brand/og-default.png')}" />
    <link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/styles.css" />
    <link rel="stylesheet" href="/assets/app/app.css" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/assets/brand/icon-192.png" />
  </head>
  <body class="app-route">
    <a class="skip-link" href="#main-content">Aller au contenu</a>
    <main class="app-standalone" id="main-content">
      <div class="app-standalone__topbar">
        <a class="app-standalone__brand" href="/" aria-label="Retour au site Zwibba">
          <img src="/assets/brand/logo-zwibba.svg" alt="" width="42" height="42" />
          <span class="app-standalone__brand-copy">
            <strong>Zwibba App</strong>
            <span>Bêta privée</span>
          </span>
        </a>
        <a class="button button--ghost" href="/">Retour au site</a>
      </div>

      <section class="app-standalone__entry">
        <div class="app-standalone__note">
          <p class="eyebrow">Version web privée</p>
          <h1>Testez Zwibba directement dans votre navigateur.</h1>
          <p>
            Publiez, parcourez, partagez et ouvrez vos annonces sans quitter l'app web.
          </p>
          <div class="store-row">
            <a class="button button--primary" href="#capture">Ouvrir l'app</a>
          </div>
        </div>

        <div class="app-standalone__frame">
          <div class="app-shell">
            <div class="app-shell__viewport" data-app-root data-screen="home"></div>
          </div>
        </div>
      </section>
    </main>
    <script>window.ZWIBBA_API_BASE_URL = ${JSON.stringify(appApiBaseUrl)};
window.ZWIBBA_SUPPORT_WHATSAPP = ${JSON.stringify({ CD: supportWhatsAppCd, BE: supportWhatsAppBe })};</script>
    <script type="module" src="/assets/app/app.js"></script>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/App/sw.js', { scope: '/App/' })
            .catch(() => {});
        });
      }
    </script>
  </body>
</html>`;
}

function renderLayout(content, {
  currentPath,
  title,
  description,
  body,
  canonicalPath = currentPath,
  ogImage = '/assets/brand/logo-zwibba.svg',
  ogImageHeight = '',
  ogImageWidth = '',
  ogTitle = title,
  productPriceAmount = '',
  productPriceCurrency = '',
  schema,
  bodyClass = '',
}) {
  const { site, ui } = content;
  const canonicalUrl = resolveUrl(site, canonicalPath);
  const schemas = Array.isArray(schema) ? schema : schema ? [schema] : [];
  const schemaMarkup = schemas
    .map((item) => `<script type="application/ld+json">${serializeJson(item)}</script>`)
    .join('\n');
  const analyticsMarkup = plausibleDomain
    ? `<script defer data-domain="${escapeHtml(plausibleDomain)}" src="${escapeHtml(plausibleSrc)}"></script>`
    : '';

  return `<!DOCTYPE html>
<html lang="${site.htmlLang}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="theme-color" content="#1E1E20" />
    <meta name="color-scheme" content="dark" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${site.locale}" />
    <meta property="og:site_name" content="${site.name}" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${resolveUrl(site, ogImage)}" />
    ${ogImageWidth ? `<meta property="og:image:width" content="${escapeHtml(ogImageWidth)}" />` : ''}
    ${ogImageHeight ? `<meta property="og:image:height" content="${escapeHtml(ogImageHeight)}" />` : ''}
    ${productPriceAmount !== '' ? `<meta property="product:price:amount" content="${escapeHtml(productPriceAmount)}" />` : ''}
    ${productPriceCurrency ? `<meta property="product:price:currency" content="${escapeHtml(productPriceCurrency)}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${resolveUrl(site, ogImage)}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml" />
    <style>
      .skip-link {
        position: absolute;
        top: 0;
        left: -9999px;
        z-index: 1000;
      }

      .skip-link:focus,
      .skip-link:active {
        left: 16px;
      }
    </style>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/styles.css" />
    ${schemaMarkup}
    ${analyticsMarkup}
  </head>
  <body class="${bodyClass}">
    <div class="site-shell">
      <a class="skip-link" href="#main-content">${ui.nav.skipLink}</a>
      ${renderNav(content, currentPath)}
      <p class="sr-only" id="site-announcer" aria-live="polite"></p>
      ${body}
      ${renderFooter(content)}
      <dialog class="download-gate" id="download-gate">
        <div class="download-gate__panel">
          <button class="download-gate__close" type="button" data-close-gate aria-label="${ui.gate.closeLabel}">${icon('close')}</button>
          <p class="eyebrow">${ui.gate.eyebrow}</p>
          <h2>${ui.gate.title}</h2>
          <p>${ui.gate.body}</p>
          <div class="store-row">${renderStoreButtons(site)}</div>
        </div>
      </dialog>
    </div>
    <script>window.ZWIBBA_UI_STRINGS = ${serializeJson(ui.client)};</script>
    <script src="/assets/app.js" defer></script>
  </body>
</html>`;
}

function renderHeroStats(content) {
  return content.site.socialProof
    .map(
      (item) => `
        <article class="metric-card">
          <strong>${escapeHtml(item.value)}</strong>
          <span>${escapeHtml(item.label)}</span>
        </article>
      `,
    )
    .join('');
}

function renderCategoryCards(content) {
  return content.categories
    .map(
      (category) => `
        <article class="category-card">
          <span class="category-card__icon">${icon(category.icon)}</span>
          <h3>${escapeHtml(category.label)}</h3>
          <p>${escapeHtml(category.hint)}</p>
        </article>
      `,
    )
    .join('');
}

function renderFeatureSteps(content) {
  return content.featureSteps
    .map(
      (step) => `
        <article class="step-card">
          <span class="step-card__index">${escapeHtml(step.step)}</span>
          <h3>${escapeHtml(step.title)}</h3>
          <p>${escapeHtml(step.copy)}</p>
        </article>
      `,
    )
    .join('');
}

function renderHighlights(content) {
  return content.platformHighlights
    .map(
      (item) => `
        <article class="highlight-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.copy)}</p>
        </article>
      `,
    )
    .join('');
}

function renderTestimonials(content) {
  return content.testimonials
    .map(
      (item) => `
        <article class="testimonial-card">
          <p class="testimonial-card__quote">“${escapeHtml(item.quote)}”</p>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.role)}</span>
        </article>
      `,
    )
    .join('');
}

function renderFaqs(items) {
  return items
    .map(
      (item) => `
        <details class="faq-item">
          <summary>${escapeHtml(item.question)}</summary>
          <p>${escapeHtml(item.answer)}</p>
        </details>
      `,
    )
    .join('');
}

function renderListingCard(site, listing, options = {}) {
  const featuredBadge = listing.isFeatured ? '<span class="listing-card__badge">Booste</span>' : '';
  const highlight = options.highlightLabel ? `<span class="listing-card__meta-tag">${escapeHtml(options.highlightLabel)}</span>` : '';
  const listingImageAsset = resolveListingImageAsset(listing);
  return `
    <article class="listing-card" data-listing-card data-category="${listing.category}" data-condition="${escapeHtml(
      conditionCode(listing.condition),
    )}" data-price="${listing.priceCdf}" data-title="${escapeHtml(listing.title.toLowerCase())}" data-published="${escapeHtml(
      listing.publishedAt,
    )}">
      <a class="listing-card__media" href="/annonce/${listing.slug}/">
        <img src="${escapeHtml(listingImageAsset)}" alt="${escapeHtml(listing.title)}" loading="lazy" width="600" height="400" />
        ${featuredBadge}
      </a>
      <div class="listing-card__content">
        <div class="listing-card__meta">
          <span>${escapeHtml(listing.categoryLabel)}</span>
          <span>${escapeHtml(listing.neighborhood)}</span>
          ${highlight}
        </div>
        <h3><a href="/annonce/${listing.slug}/">${escapeHtml(listing.title)}</a></h3>
        <p>${escapeHtml(listing.summary)}</p>
        <div class="listing-card__footer">
          <strong>${escapeHtml(formatPrice(site, listing.priceCdf))}</strong>
          <span>${escapeHtml(listing.publishedAt)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderSafetyTips(safetyTips) {
  return safetyTips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('');
}

function renderLandingPage(content) {
  const { site, listings, ui } = content;
  const landing = ui.landing;
  const highlightedListings = listings.slice(0, 4).map((listing) => renderListingCard(site, listing, { highlightLabel: listing.transactionType })).join('');

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: site.name,
      url: site.baseUrl,
      description: site.description,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'MobileApplication',
      name: site.name,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Android, Huawei',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: site.currency,
      },
      description: site.description,
      areaServed: site.marketLabel,
    },
  ];

  const body = `
    <main id="main-content">
      <section class="hero">
        <div class="hero__copy">
          <p class="eyebrow">${escapeHtml(site.marketLabel)} ${landing.heroEyebrowSuffix}</p>
          <h1>${landing.heroTitle}</h1>
          <p class="hero__lede">${escapeHtml(site.description)}</p>
          <div class="store-row">${renderStoreButtons(site)}</div>
          <div class="metric-grid">${renderHeroStats(content)}</div>
        </div>
        <div class="hero__stage">
          <div class="hero-stage-card hero-stage-card--wide">
            <span class="hero-stage-card__label">${icon('spark')} ${landing.heroStage.aiLabel}</span>
            <h2>${landing.heroStage.aiTitle}</h2>
            <p>${landing.heroStage.aiCopy}</p>
          </div>
          <div class="hero-stage-card">
            <span class="hero-stage-card__label">${icon('chat')} ${landing.heroStage.accessLabel}</span>
            <p>${landing.heroStage.accessCopy}</p>
          </div>
          <div class="hero-stage-card">
            <span class="hero-stage-card__label">${icon('shield')} ${landing.heroStage.lightLabel}</span>
            <p>${landing.heroStage.lightCopy}</p>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section__heading">
          <p class="eyebrow">${landing.flow.eyebrow}</p>
          <h2>${landing.flow.title}</h2>
          <p>${landing.flow.copy}</p>
        </div>
        <div class="step-grid">${renderFeatureSteps(content)}</div>
      </section>

      <section class="section section--accent">
        <div class="section__heading">
          <p class="eyebrow">${landing.categories.eyebrow}</p>
          <h2>${landing.categories.title}</h2>
          <p>${landing.categories.copy}</p>
        </div>
        <div class="category-grid">${renderCategoryCards(content)}</div>
      </section>

      <section class="section">
        <div class="section__heading">
          <p class="eyebrow">${landing.why.eyebrow}</p>
          <h2>${landing.why.title}</h2>
        </div>
        <div class="highlight-grid">${renderHighlights(content)}</div>
      </section>

      <section class="section">
        <div class="section__heading">
          <p class="eyebrow">${landing.listings.eyebrow}</p>
          <h2>${landing.listings.title}</h2>
          <p>${landing.listings.copy}</p>
        </div>
        <div class="listing-grid">${highlightedListings}</div>
      </section>

      <section class="section section--dense">
        <div class="section__heading">
          <p class="eyebrow">${landing.testimonials.eyebrow}</p>
          <h2>${landing.testimonials.title}</h2>
        </div>
        <div class="testimonial-grid">${renderTestimonials(content)}</div>
      </section>

      <section class="section section--cta">
        <div class="cta-panel">
          <div>
            <p class="eyebrow">${landing.cta.eyebrow}</p>
            <h2>${landing.cta.title}</h2>
            <p>${landing.cta.copy}</p>
          </div>
          <div class="store-row">${renderStoreButtons(site)}</div>
        </div>
      </section>
    </main>
  `;

  return renderLayout(content, {
    currentPath: '/',
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
    body,
    schema,
  });
}

function renderBrowsePage(content) {
  const { site, listings, categories, ui } = content;
  const browse = ui.browse;
  const featured = listings.filter((item) => item.isFeatured).map((listing) => renderListingCard(site, listing, { highlightLabel: browse.featuredBadge })).join('');
  const cards = listings.map((listing) => renderListingCard(site, listing, { highlightLabel: listing.transactionType })).join('');
  const chips = ['all', ...categories.map((category) => category.slug)]
    .map((value) => {
      const label = value === 'all' ? browse.chipAllLabel : categories.find((item) => item.slug === value).label;
      return `<button class="chip${value === 'all' ? ' is-active' : ''}" type="button" data-chip="${value}">${escapeHtml(label)}</button>`;
    })
    .join('');

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: browse.pageTitle,
    description: browse.pageDescription,
    url: resolveUrl(site, '/annonces/'),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: listings.map((listing, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: resolveUrl(site, `/annonce/${listing.slug}/`),
        name: listing.title,
      })),
    },
  };

  const body = `
    <main id="main-content">
      <section class="page-hero page-hero--compact">
        <div>
          <p class="eyebrow">${browse.hero.eyebrow}</p>
          <h1>${browse.hero.title}</h1>
          <p>${browse.hero.copy}</p>
        </div>
      </section>

      <section class="section section--dense">
        <div class="feature-strip">
          ${featured}
        </div>
      </section>

      <section class="section browse-section">
        <aside class="filter-panel">
          <div class="field">
            <label for="browse-search">${browse.filters.searchLabel}</label>
            <input id="browse-search" type="search" placeholder="${escapeHtml(browse.filters.searchPlaceholder)}" autocomplete="off" />
          </div>
          <div class="field">
            <label for="browse-category">${browse.filters.categoryLabel}</label>
            <select id="browse-category">
              <option value="all">${browse.filters.categoryAllLabel}</option>
              ${categories
                .map((category) => `<option value="${category.slug}">${escapeHtml(category.label)}</option>`)
                .join('')}
            </select>
          </div>
          <div class="field">
            <label for="browse-condition">${browse.filters.conditionLabel}</label>
            <select id="browse-condition">
              <option value="all">${browse.filters.conditionAllLabel}</option>
              ${browse.conditions
                .map((condition) => `<option value="${condition.code}">${escapeHtml(condition.label)}</option>`)
                .join('\n              ')}
            </select>
          </div>
          <div class="field">
            <label for="browse-price">${browse.filters.priceLabel}</label>
            <select id="browse-price">
              <option value="all">${browse.filters.priceAllLabel}</option>
              ${browse.filters.priceOptions
                .map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`)
                .join('\n              ')}
            </select>
          </div>
          <div class="field">
            <label for="browse-sort">${browse.filters.sortLabel}</label>
            <select id="browse-sort">
              ${browse.filters.sortOptions
                .map((option) => `<option value="${option.value}">${option.label}</option>`)
                .join('\n              ')}
            </select>
          </div>
        </aside>

        <div class="browse-results">
          <div class="chip-row">${chips}</div>
          <div class="browse-results__header">
            <div>
              <p class="eyebrow">${browse.categoriesEyebrow}</p>
              <h2 id="results-summary" aria-live="polite">${browse.resultsFallback}</h2>
            </div>
            <a class="button button--ghost" href="/ambassadeur/">${browse.ambassadorCta}</a>
          </div>
          <div class="listing-grid" id="browse-results-grid">${cards}</div>
        </div>
      </section>
    </main>
  `;

  return renderLayout(content, {
    currentPath: '/annonces/',
    title: `${browse.pageTitle} | ${site.marketLabel}`,
    description: browse.pageDescription,
    body,
    schema,
  });
}

function renderListingPage(content, listing) {
  const { site, listings, ui } = content;
  const listingUi = ui.listing;
  const listingImageAsset = resolveListingImageAsset(listing);
  const hasStoryImage = Boolean(listing.storyImageUrl);
  const ogImage = hasStoryImage ? listing.storyImageUrl : listingImageAsset;
  const ogTitle = hasStoryImage
    ? `Je vends sur Zwibba ! ${listing.title}`
    : `${listing.title} | Zwibba`;
  const similar = listings
    .filter((item) => item.slug !== listing.slug && item.category === listing.category)
    .slice(0, 2)
    .map((item) => renderListingCard(site, item, { highlightLabel: listingUi.similarBadge }))
    .join('');

  const schema = {
    '@context': 'https://schema.org',
    '@type': listing.listingType === 'Service' ? 'Service' : 'Product',
    name: listing.title,
    description: listing.summary,
    image: resolveUrl(site, listingImageAsset),
    offers: {
      '@type': 'Offer',
      priceCurrency: site.currency,
      price: listing.priceCdf,
      availability: 'https://schema.org/InStock',
    },
    areaServed: listing.city,
    seller: {
      '@type': 'Organization',
      name: listing.seller.name,
    },
  };

  const detailBody = `
    <main id="main-content">
      <section class="page-hero listing-hero">
        <div class="listing-hero__media">
          <img src="${escapeHtml(listingImageAsset)}" alt="${escapeHtml(listing.title)}" width="1200" height="800" />
        </div>
        <div class="listing-hero__content">
          <div class="meta-pill-row">
            <span class="meta-pill">${escapeHtml(listing.categoryLabel)}</span>
            <span class="meta-pill">${escapeHtml(listing.transactionType)}</span>
            <span class="meta-pill">${escapeHtml(listing.condition)}</span>
          </div>
          <h1>${escapeHtml(listing.title)}</h1>
          <p class="listing-hero__price">${escapeHtml(formatPrice(site, listing.priceCdf))}</p>
          <p class="listing-hero__summary">${escapeHtml(listing.summary)}</p>
          <div class="detail-actions">
            <button class="button button--primary" type="button" data-gated="call">${icon('phone')} ${listingUi.call}</button>
            <button class="button button--ghost" type="button" data-gated="whatsapp">${listingUi.whatsapp}</button>
            <button class="button button--ghost" type="button" data-gated="sms">${listingUi.sms}</button>
            <button class="button button--ghost" type="button" data-share-button data-share-title="${escapeHtml(
              listing.title,
            )}" data-share-url="${resolveUrl(site, `/annonce/${listing.slug}/`)}">${icon('share')} ${listingUi.share}</button>
          </div>
          <p class="detail-note">${icon('shield')} ${listingUi.detailNote}</p>
        </div>
      </section>

      <section class="section listing-detail-layout">
        <div class="listing-story">
          <article class="detail-card">
            <p class="eyebrow">${listingUi.descriptionEyebrow}</p>
            ${listing.description.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
          </article>
          <article class="detail-card">
            <p class="eyebrow">${listingUi.specsEyebrow}</p>
            <dl class="spec-grid">
              ${listing.specs
                .map(
                  ([label, value]) => `
                    <div>
                      <dt>${escapeHtml(label)}</dt>
                      <dd>${escapeHtml(value)}</dd>
                    </div>
                  `,
                )
                .join('')}
            </dl>
          </article>
          <article class="detail-card detail-card--warning">
            <p class="eyebrow">${listingUi.safetyEyebrow}</p>
            <ul class="safety-list">${renderSafetyTips(content.safetyTips)}</ul>
          </article>
        </div>

        <aside class="listing-sidebar">
          <article class="detail-card">
            <p class="eyebrow">${listingUi.sellerEyebrow}</p>
            <h2>${escapeHtml(listing.seller.name)}</h2>
            <p>${escapeHtml(listing.seller.role)}</p>
            <ul class="seller-facts">
              <li>${escapeHtml(listing.seller.memberSince)}</li>
              <li>${escapeHtml(listing.seller.listings)}</li>
              <li>${escapeHtml(listing.seller.responseTime)}</li>
              <li>${escapeHtml(listing.neighborhood)}, ${escapeHtml(listing.city)}</li>
            </ul>
            <button class="button button--primary button--block" type="button" data-gated="seller-profile">${listingUi.viewInApp}</button>
          </article>
          <article class="detail-card">
            <p class="eyebrow">${listingUi.shareEyebrow}</p>
            <p>${listingUi.shareCopy}</p>
            <button class="button button--ghost button--block" type="button" data-share-button data-share-title="${escapeHtml(
              listing.title,
            )}" data-share-url="${resolveUrl(site, `/annonce/${listing.slug}/`)}">${listingUi.copyLink}</button>
          </article>
        </aside>
      </section>

      <section class="section section--dense">
        <div class="section__heading">
          <p class="eyebrow">${listingUi.sameCategoryEyebrow}</p>
          <h2>${listingUi.sameCategoryTitlePrefix} ${escapeHtml(listing.categoryLabel.toLowerCase())}</h2>
        </div>
        <div class="listing-grid">${similar}</div>
      </section>
    </main>
  `;

  return renderLayout(content, {
    currentPath: `/annonce/${listing.slug}/`,
    canonicalPath: `/annonce/${listing.slug}/`,
    title: `${listing.title} | Zwibba`,
    description: listing.summary,
    ogImage,
    ogImageHeight: hasStoryImage ? '1920' : '',
    ogImageWidth: hasStoryImage ? '1080' : '',
    ogTitle,
    productPriceAmount: hasStoryImage ? String(listing.priceCdf) : '',
    productPriceCurrency: hasStoryImage ? 'CDF' : '',
    body: detailBody,
    schema,
    bodyClass: 'page-listing',
  });
}

function renderAmbassadorPage(content) {
  const { site, ambassadorChannels, ui } = content;
  const ambassador = ui.ambassador;
  const channels = ambassadorChannels
    .map(
      (channel) => `
        <article class="channel-card">
          <h3>${escapeHtml(channel.name)}</h3>
          <p>${escapeHtml(channel.copy)}</p>
        </article>
      `,
    )
    .join('');

  const [ambassadorStep1, ambassadorStep2, ambassadorStep3] = ambassador.steps.items;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: ambassador.pageTitle,
    description: ambassador.pageDescription,
    url: resolveUrl(site, '/ambassadeur/'),
  };

  const body = `
    <main id="main-content">
      <section class="page-hero">
        <div>
          <p class="eyebrow">${ambassador.hero.eyebrow}</p>
          <h1>${ambassador.hero.title}</h1>
          <p>${ambassador.hero.copy}</p>
        </div>
        <div class="referral-panel">
          <p class="referral-panel__label">${ambassador.panel.label}</p>
          <strong id="referral-code-output">${ambassador.panel.code}</strong>
          <p>${ambassador.panel.copy}</p>
          <div class="referral-input-group">
            <label for="referral-code-input">${ambassador.panel.inputLabel}</label>
            <input id="referral-code-input" type="text" placeholder="${ambassador.panel.code}" autocomplete="off" spellcheck="false" />
          </div>
          <div class="store-row store-row--stacked">${renderStoreButtons(site)}</div>
          <button class="button button--ghost button--block" type="button" data-copy-referral>${ambassador.panel.copyButton}</button>
        </div>
      </section>

      <section class="section">
        <div class="section__heading">
          <p class="eyebrow">${ambassador.steps.eyebrow}</p>
          <h2>${ambassador.steps.title}</h2>
        </div>
        <div class="step-grid">
          <article class="step-card">
            <span class="step-card__index">${ambassadorStep1.step}</span>
            <h3>${ambassadorStep1.title}</h3>
            <p>${ambassadorStep1.copy}</p>
          </article>
          <article class="step-card">
            <span class="step-card__index">${ambassadorStep2.step}</span>
            <h3>${ambassadorStep2.title}</h3>
            <p>${ambassadorStep2.copy}</p>
          </article>
          <article class="step-card">
            <span class="step-card__index">${ambassadorStep3.step}</span>
            <h3>${ambassadorStep3.title}</h3>
            <p>${ambassadorStep3.copy}</p>
          </article>
        </div>
      </section>

      <section class="section section--accent">
        <div class="section__heading">
          <p class="eyebrow">${ambassador.channels.eyebrow}</p>
          <h2>${ambassador.channels.title}</h2>
        </div>
        <div class="channel-grid">${channels}</div>
      </section>

      <section class="section section--dense">
        <div class="cta-panel">
          <div>
            <p class="eyebrow">${ambassador.cta.eyebrow}</p>
            <h2>${ambassador.cta.title}</h2>
          </div>
          <div class="store-row">${renderStoreButtons(site)}</div>
        </div>
      </section>
    </main>
  `;

  return renderLayout(content, {
    currentPath: '/ambassadeur/',
    title: ambassador.pageTitle,
    description: ambassador.pageDescription,
    body,
    schema,
  });
}

function renderAboutPage(content) {
  const { site, aboutValues, ui } = content;
  const about = ui.about;
  const [aboutNote1, aboutNote2, aboutNote3] = about.context.notes;
  const values = aboutValues
    .map(
      (item) => `
        <article class="value-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.copy)}</p>
        </article>
      `,
    )
    .join('');

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: about.pageTitle,
    description: about.pageDescription,
    url: resolveUrl(site, '/a-propos/'),
  };

  const body = `
    <main id="main-content">
      <section class="page-hero">
        <div>
          <p class="eyebrow">${about.hero.eyebrow}</p>
          <h1>${about.hero.title}</h1>
          <p>${about.hero.copy}</p>
        </div>
      </section>

      <section class="section">
        <div class="section__heading">
          <p class="eyebrow">${about.values.eyebrow}</p>
          <h2>${about.values.title}</h2>
        </div>
        <div class="highlight-grid">${values}</div>
      </section>

      <section class="section section--accent">
        <div class="section__heading">
          <p class="eyebrow">${about.context.eyebrow}</p>
          <h2>${about.context.title}</h2>
          <p>${about.context.copy}</p>
        </div>
        <div class="note-card-grid">
          <article class="note-card">
            <h3>${aboutNote1.title}</h3>
            <p>${aboutNote1.copy}</p>
          </article>
          <article class="note-card">
            <h3>${aboutNote2.title}</h3>
            <p>${aboutNote2.copy}</p>
          </article>
          <article class="note-card">
            <h3>${aboutNote3.title}</h3>
            <p>${aboutNote3.copy}</p>
          </article>
        </div>
      </section>
    </main>
  `;

  return renderLayout(content, {
    currentPath: '/a-propos/',
    title: about.pageTitle,
    description: about.pageDescription,
    body,
    schema,
  });
}

function renderContactPage(content) {
  const { site, supportTopics, faqs, ui } = content;
  const contact = ui.contact;
  const topics = supportTopics
    .map(
      (item) => `
        <article class="support-card">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.copy)}</p>
          <a class="button button--ghost" href="mailto:${site.supportEmail}?subject=${encodeURIComponent(item.title)}">${escapeHtml(
            item.cta,
          )}</a>
        </article>
      `,
    )
    .join('');

  const supportWhatsAppMarkets = [
    { label: contact.whatsapp.cd, number: supportWhatsAppCd },
    { label: contact.whatsapp.be, number: supportWhatsAppBe },
  ].filter((market) => whatsappDigits(market.number));

  const supportWhatsAppBlock = supportWhatsAppMarkets.length
    ? `
      <article class="detail-card">
        <p class="eyebrow">${contact.whatsapp.eyebrow}</p>
        <ul class="seller-facts">
          ${supportWhatsAppMarkets
            .map(
              (market) => `
                <li>
                  <a href="https://wa.me/${whatsappDigits(market.number)}" target="_blank" rel="noreferrer">${escapeHtml(
                    market.label,
                  )}</a>
                </li>
              `,
            )
            .join('')}
        </ul>
      </article>
    `
    : '';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: contact.pageTitle,
    description: contact.pageDescription,
    url: resolveUrl(site, '/contact/'),
  };

  const body = `
    <main id="main-content">
      <section class="page-hero">
        <div>
          <p class="eyebrow">${contact.hero.eyebrow}</p>
          <h1>${contact.hero.title}</h1>
          <p>${contact.hero.copy}</p>
        </div>
      </section>

      <section class="section">
        <div class="support-grid">${topics}</div>
      </section>

      <section class="section section--accent">
        <div class="contact-layout">
          <article class="detail-card">
            <p class="eyebrow">${contact.form.eyebrow}</p>
            <form id="contact-form" class="contact-form">
              <label>
                ${contact.form.nameLabel}
                <input type="text" name="name" placeholder="${escapeHtml(contact.form.namePlaceholder)}" autocomplete="name" required />
              </label>
              <label>
                ${contact.form.emailLabel}
                <input type="email" name="email" placeholder="${escapeHtml(contact.form.emailPlaceholder)}" autocomplete="email" required />
              </label>
              <label>
                ${contact.form.topicLabel}
                <input type="text" name="topic" placeholder="${escapeHtml(contact.form.topicPlaceholder)}" autocomplete="organization-title" required />
              </label>
              <label>
                ${contact.form.messageLabel}
                <textarea name="message" rows="6" placeholder="${escapeHtml(contact.form.messagePlaceholder)}" required></textarea>
              </label>
              <button class="button button--primary" type="submit">${contact.form.submit}</button>
            </form>
          </article>
          <article class="detail-card">
            <p class="eyebrow">${contact.coordinates.eyebrow}</p>
            <h2>${escapeHtml(site.supportEmail)}</h2>
            <p>${contact.coordinates.copy}</p>
            <ul class="seller-facts">
              <li>${escapeHtml(site.marketLabel)}</li>
              <li>${contact.coordinates.responseTime}</li>
              <li>${contact.coordinates.scope}</li>
            </ul>
            <div class="faq-stack">${renderFaqs(faqs.slice(0, 2))}</div>
          </article>
          ${supportWhatsAppBlock}
        </div>
      </section>
    </main>
  `;

  return renderLayout(content, {
    currentPath: '/contact/',
    title: contact.pageTitle,
    description: contact.pageDescription,
    body,
    schema,
  });
}

function renderReferralPage(content) {
  const { site, ui } = content;
  const referral = ui.referral;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: referral.pageTitle,
    description: referral.pageDescription,
    url: resolveUrl(site, '/r/'),
  };

  const body = `
    <main id="main-content">
      <section class="page-hero page-hero--referral">
        <div class="referral-redirect">
          <p class="eyebrow">${referral.eyebrow}</p>
          <h1>${referral.title}</h1>
          <p>${referral.copy}</p>
          <strong id="referral-code-output">${referral.code}</strong>
          <a class="button button--primary" id="referral-fallback-link" href="/ambassadeur/">${referral.continueLabel}</a>
        </div>
      </section>
    </main>
  `;

  return renderLayout(content, {
    currentPath: '/r/',
    title: referral.pageTitle,
    description: referral.pageDescription,
    body,
    schema,
  });
}

function renderFavicon() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="32" fill="#161618"/>
  <rect x="18" y="18" width="92" height="92" rx="26" fill="#2A2A2C" stroke="#6BE66B" stroke-width="4"/>
  <path d="M36 38h56v10L54 80h38v10H36V80l38-32H36z" fill="#6BE66B"/>
</svg>`;
}

function buildSitemap(urls) {
  const entries = urls
    .map((url) => `<url><loc>${escapeHtml(url)}</loc></url>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;
}

function buildRobots(content) {
  const { site } = content;
  return `User-agent: *
Allow: /

Sitemap: ${resolveUrl(site, '/sitemap.xml')}
`;
}

function build() {
  const content = {
    site: frCd.site,
    ui: frCd.ui,
    categories: frCd.categories,
    featureSteps: frCd.featureSteps,
    platformHighlights: frCd.platformHighlights,
    testimonials: frCd.testimonials,
    faqs: frCd.faqs,
    aboutValues: frCd.aboutValues,
    supportTopics: frCd.supportTopics,
    ambassadorChannels: frCd.ambassadorChannels,
    listings: frCd.listings,
    safetyTips: frCd.ui.safetyTips,
  };

  rmSync(distDir, { recursive: true, force: true });
  ensureDir(assetsDir);

  if (existsSync(path.join(repoRoot, 'public'))) {
    cpSync(path.join(repoRoot, 'public'), distDir, { recursive: true });
  }

  cpSync(path.join(repoRoot, 'Logo_zwibba.svg'), path.join(assetsDir, 'brand', 'logo-zwibba.svg'), { recursive: false });
  cpSync(path.join(repoRoot, 'og-default.png'), path.join(assetsDir, 'brand', 'og-default.png'), { recursive: false });
  writeText(path.join(assetsDir, 'brand', 'favicon.svg'), renderFavicon());
  writeText(path.join(assetsDir, 'styles.css'), readFileSync(path.join(repoRoot, 'src/site/styles.css'), 'utf8'));
  writeText(path.join(assetsDir, 'app.js'), readFileSync(path.join(repoRoot, 'src/site/app.js'), 'utf8'));
  cpSync(path.join(repoRoot, 'App'), path.join(assetsDir, 'app'), { recursive: true });
  cpSync(path.join(repoRoot, 'shared'), path.join(assetsDir, 'shared'), { recursive: true });

  writeText(path.join(distDir, 'manifest.webmanifest'), renderManifest());
  writeText(
    path.join(distDir, 'App', 'sw.js'),
    readFileSync(path.join(repoRoot, 'src/site/service-worker.js'), 'utf8').replace(
      '__ZWIBBA_BUILD__',
      `zwibba-${Date.now()}`,
    ),
  );

  for (const listing of content.listings) {
    writeText(path.join(assetsDir, 'listings', `${listing.slug}.svg`), buildListingImage(content.site, listing));
  }

  const appPage = renderAppPage();
  const pages = [
    { file: 'index.html', path: '/', html: renderLandingPage(content) },
    { file: 'App/index.html', path: '/App/', html: appPage },
    { file: 'annonces/index.html', path: '/annonces/', html: renderBrowsePage(content) },
    { file: 'ambassadeur/index.html', path: '/ambassadeur/', html: renderAmbassadorPage(content) },
    { file: 'a-propos/index.html', path: '/a-propos/', html: renderAboutPage(content) },
    { file: 'contact/index.html', path: '/contact/', html: renderContactPage(content) },
    { file: 'r/index.html', path: '/r/', html: renderReferralPage(content) },
    ...content.listings.map((listing) => ({
      file: `annonce/${listing.slug}/index.html`,
      path: `/annonce/${listing.slug}/`,
      html: renderListingPage(content, listing),
    })),
  ];

  pages.forEach((page) => writeText(path.join(distDir, page.file), page.html));

  writeText(
    path.join(distDir, 'sitemap.xml'),
    buildSitemap(pages.map((page) => resolveUrl(content.site, page.path))),
  );
  writeText(path.join(distDir, 'robots.txt'), buildRobots(content));
}

async function acquireBuildLock() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      mkdirSync(buildLockDir);
      return;
    } catch (error) {
      if (error && typeof error === 'object' && error.code === 'EEXIST') {
        await delay(50);
        continue;
      }

      throw error;
    }
  }

  throw new Error('Timed out while waiting for the build lock.');
}

async function buildWithLock() {
  await acquireBuildLock();

  try {
    build();
  } finally {
    rmSync(buildLockDir, { force: true, recursive: true });
  }
}

await buildWithLock();
