import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');
const assetsDir = path.join(distDir, 'assets');
const appApiBaseUrl =
  process.env.ZWIBBA_API_BASE_URL || 'https://api-production-b1b58.up.railway.app';
const plausibleDomain = process.env.PLAUSIBLE_DOMAIN || '';
const plausibleSrc = process.env.PLAUSIBLE_SRC || 'https://plausible.io/js/script.js';

const safetyTips = [
  "Évitez de payer à l'avance, même pour la livraison.",
  'Rencontrez le vendeur dans un lieu public sûr.',
  "Inspectez l'article avant de payer.",
  "Assurez-vous que l'article emballé est bien celui que vous avez vérifié.",
  'Ne payez que si vous êtes satisfait.',
];

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

function formatCdf(value) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} CDF`;
}

function resolveUrl(relativePath) {
  return new URL(relativePath, site.baseUrl).toString();
}

function icon(name, className = '') {
  const markup = iconPaths[name.toLowerCase()] || iconPaths.spark;
  const classAttr = className ? ` class="${className}"` : '';
  return `<svg${classAttr} viewBox="0 0 24 24" aria-hidden="true">${markup}</svg>`;
}

function buildListingImage(listing) {
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
    formatCdf(listing.priceCdf),
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

function renderStoreButtons(extraClass = '') {
  return site.stores
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

function renderNav(currentPath) {
  const links = site.nav
    .map(({ href, label }) => {
      const isActive = currentPath === href || (href !== '/' && currentPath.startsWith(href));
      return `<a class="nav-link${isActive ? ' is-active' : ''}" href="${href}">${escapeHtml(label)}</a>`;
    })
    .join('');

  return `
    <header class="site-header">
      <div class="site-header__inner">
        <a class="brandmark" href="/" aria-label="Zwibba accueil">
          <img src="/assets/brand/logo-zwibba.svg" alt="Zwibba" width="160" height="113" />
        </a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
          <span class="menu-toggle__icon menu-toggle__icon--open">${icon('menu')}</span>
          <span class="menu-toggle__icon menu-toggle__icon--close">${icon('close')}</span>
          <span class="sr-only">Menu</span>
        </button>
        <nav class="site-nav" id="site-nav" data-open="false">
          ${links}
          <a class="button button--ghost" href="/annonces/">Explorer</a>
          <a class="button button--primary" href="/ambassadeur/">Télécharger</a>
        </nav>
      </div>
    </header>
  `;
}

function renderFooter() {
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
          <h2 class="site-footer__title">Navigation</h2>
          <div class="site-footer__links">${footerLinks}</div>
        </div>
        <div>
          <h2 class="site-footer__title">Disponible bientôt</h2>
          <div class="store-row store-row--footer">${renderStoreButtons('store-button--compact')}</div>
        </div>
      </div>
      <div class="site-footer__meta">
        <span>${escapeHtml(site.market)}</span>
        <span>Simple · Rapide · Mobile</span>
      </div>
    </footer>
  `;
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
    <link rel="icon" href="/assets/brand/favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/styles.css" />
    <link rel="stylesheet" href="/assets/app/app.css" />
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
          <p class="eyebrow">Zwibba web bêta</p>
          <h1>Vendez et explorez les annonces Zwibba en direct.</h1>
          <p>
            Accédez à la version web de Zwibba pour publier, rechercher, ouvrir une annonce
            et partager votre lien sans quitter l'app.
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
    <script>window.ZWIBBA_API_BASE_URL = ${JSON.stringify(appApiBaseUrl)};</script>
    <script type="module" src="/assets/app/app.js"></script>
  </body>
</html>`;
}

function renderLayout({
  currentPath,
  title,
  description,
  body,
  canonicalPath = currentPath,
  ogImage = '/assets/brand/logo-zwibba.svg',
  schema,
  bodyClass = '',
}) {
  const canonicalUrl = resolveUrl(canonicalPath);
  const schemas = Array.isArray(schema) ? schema : schema ? [schema] : [];
  const schemaMarkup = schemas
    .map((item) => `<script type="application/ld+json">${serializeJson(item)}</script>`)
    .join('\n');
  const analyticsMarkup = plausibleDomain
    ? `<script defer data-domain="${escapeHtml(plausibleDomain)}" src="${escapeHtml(plausibleSrc)}"></script>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
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
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${resolveUrl(ogImage)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${resolveUrl(ogImage)}" />
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
      <a class="skip-link" href="#main-content">Aller au contenu</a>
      ${renderNav(currentPath)}
      <p class="sr-only" id="site-announcer" aria-live="polite"></p>
      ${body}
      ${renderFooter()}
      <dialog class="download-gate" id="download-gate">
        <div class="download-gate__panel">
          <button class="download-gate__close" type="button" data-close-gate aria-label="Fermer">${icon('close')}</button>
          <p class="eyebrow">Action réservée à l'application</p>
          <h2>Ouvrez Zwibba pour continuer</h2>
          <p>Le site sert à découvrir et à partager. Pour publier, enregistrer ou contacter un vendeur, passez par l'application Zwibba.</p>
          <div class="store-row">${renderStoreButtons()}</div>
        </div>
      </dialog>
    </div>
    <script src="/assets/app.js" defer></script>
  </body>
</html>`;
}

function renderHeroStats() {
  return site.socialProof
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

function renderCategoryCards() {
  return categories
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

function renderFeatureSteps() {
  return featureSteps
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

function renderHighlights() {
  return platformHighlights
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

function renderTestimonials() {
  return testimonials
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

function renderListingCard(listing, options = {}) {
  const featuredBadge = listing.isFeatured ? '<span class="listing-card__badge">Booste</span>' : '';
  const highlight = options.highlightLabel ? `<span class="listing-card__meta-tag">${escapeHtml(options.highlightLabel)}</span>` : '';
  return `
    <article class="listing-card" data-listing-card data-category="${listing.category}" data-condition="${escapeHtml(
      listing.condition.toLowerCase(),
    )}" data-price="${listing.priceCdf}" data-title="${escapeHtml(listing.title.toLowerCase())}" data-published="${escapeHtml(
      listing.publishedAt,
    )}">
      <a class="listing-card__media" href="/annonce/${listing.slug}/">
        <img src="/assets/listings/${listing.slug}.svg" alt="${escapeHtml(listing.title)}" loading="lazy" width="600" height="400" />
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
          <strong>${escapeHtml(formatCdf(listing.priceCdf))}</strong>
          <span>${escapeHtml(listing.publishedAt)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderSafetyTips() {
  return safetyTips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join('');
}

function renderLandingPage() {
  const highlightedListings = listings.slice(0, 4).map((listing) => renderListingCard(listing, { highlightLabel: listing.transactionType })).join('');

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
        priceCurrency: 'CDF',
      },
      description: site.description,
      areaServed: site.market,
    },
  ];

  const body = `
    <main id="main-content">
      <section class="hero">
        <div class="hero__copy">
          <p class="eyebrow">${escapeHtml(site.market)} · Petites annonces pour mobile</p>
          <h1>La place de marché qui transforme une photo en annonce prête à publier.</h1>
          <p class="hero__lede">${escapeHtml(site.description)}</p>
          <div class="store-row">${renderStoreButtons()}</div>
          <div class="metric-grid">${renderHeroStats()}</div>
        </div>
        <div class="hero__stage">
          <div class="hero-stage-card hero-stage-card--wide">
            <span class="hero-stage-card__label">${icon('spark')} Zwibba IA</span>
            <h2>Photo → analyse → prix conseillé → publication</h2>
            <p>L'application prend vos photos, trouve la catégorie et propose une description et un prix en CDF.</p>
          </div>
          <div class="hero-stage-card">
            <span class="hero-stage-card__label">${icon('chat')} Accès protégé</span>
            <p>Le site aide à découvrir les annonces. L'application sert ensuite à contacter, enregistrer et publier.</p>
          </div>
          <div class="hero-stage-card">
            <span class="hero-stage-card__label">${icon('shield')} Léger sur 3G</span>
            <p>Peu de chargement et des images légères pour garder une navigation fluide sur un réseau lent.</p>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section__heading">
          <p class="eyebrow">Flux central</p>
          <h2>Publier une annonce doit être très simple.</h2>
          <p>Le parcours doit rester court, clair et pensé pour le mobile. Le site reprend cette idée et mène vers les bons points d'entrée.</p>
        </div>
        <div class="step-grid">${renderFeatureSteps()}</div>
      </section>

      <section class="section section--accent">
        <div class="section__heading">
          <p class="eyebrow">Catégories</p>
          <h2>Dix univers clés pour le marché de Lubumbashi.</h2>
          <p>Téléphones, immobilier, services, alimentation ou agriculture : les catégories suivent les usages du terrain.</p>
        </div>
        <div class="category-grid">${renderCategoryCards()}</div>
      </section>

      <section class="section">
        <div class="section__heading">
          <p class="eyebrow">Pourquoi ça marche</p>
          <h2>Un site simple qui travaille avec l'application.</h2>
        </div>
        <div class="highlight-grid">${renderHighlights()}</div>
      </section>

      <section class="section">
        <div class="section__heading">
          <p class="eyebrow">Annonces en avant</p>
          <h2>Une vitrine web légère, claire et facile à partager.</h2>
          <p>Les fiches d'annonce sont prêtes pour le partage sur WhatsApp et Facebook, tout en gardant les actions sensibles dans l'application.</p>
        </div>
        <div class="listing-grid">${highlightedListings}</div>
      </section>

      <section class="section section--dense">
        <div class="section__heading">
          <p class="eyebrow">Voix du terrain</p>
          <h2>Une plateforme faite pour des usages locaux, pas pour une démo générique.</h2>
        </div>
        <div class="testimonial-grid">${renderTestimonials()}</div>
      </section>

      <section class="section section--cta">
        <div class="cta-panel">
          <div>
            <p class="eyebrow">Prêt pour le lancement</p>
            <h2>Téléchargez Zwibba, ouvrez votre appareil photo et publiez.</h2>
            <p>Le site s'occupe de la découverte et du partage. L'application garde le contact et la confiance.</p>
          </div>
          <div class="store-row">${renderStoreButtons()}</div>
        </div>
      </section>
    </main>
  `;

  return renderLayout({
    currentPath: '/',
    title: `${site.name} | ${site.tagline}`,
    description: site.description,
    body,
    schema,
  });
}

function renderBrowsePage() {
  const featured = listings.filter((item) => item.isFeatured).map((listing) => renderListingCard(listing, { highlightLabel: 'Top Ad' })).join('');
  const cards = listings.map((listing) => renderListingCard(listing, { highlightLabel: listing.transactionType })).join('');
  const chips = ['all', ...categories.map((category) => category.slug)]
    .map((value) => {
      const label = value === 'all' ? 'Tout' : categories.find((item) => item.slug === value).label;
      return `<button class="chip${value === 'all' ? ' is-active' : ''}" type="button" data-chip="${value}">${escapeHtml(label)}</button>`;
    })
    .join('');

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Annonces Zwibba',
    description:
      "Parcourez les annonces Zwibba : catégories, filtres, prix en CDF et fiches d'annonce faciles à partager.",
    url: resolveUrl('/annonces/'),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: listings.map((listing, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: resolveUrl(`/annonce/${listing.slug}/`),
        name: listing.title,
      })),
    },
  };

  const body = `
    <main id="main-content">
      <section class="page-hero page-hero--compact">
        <div>
          <p class="eyebrow">Petites annonces</p>
          <h1>Explorez les annonces Zwibba avant d'ouvrir l'application.</h1>
          <p>Recherche, catégories, tri et repères utiles : le site reste simple, rapide et facile à partager.</p>
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
            <label for="browse-search">Recherche</label>
            <input id="browse-search" type="search" placeholder="Ex: Galaxy, terrain, plomberie..." autocomplete="off" />
          </div>
          <div class="field">
            <label for="browse-category">Catégorie</label>
            <select id="browse-category">
              <option value="all">Toutes</option>
              ${categories
                .map((category) => `<option value="${category.slug}">${escapeHtml(category.label)}</option>`)
                .join('')}
            </select>
          </div>
          <div class="field">
            <label for="browse-condition">État</label>
            <select id="browse-condition">
              <option value="all">Toutes</option>
              <option value="neuf">Neuf</option>
              <option value="bon état">Bon état</option>
              <option value="très bon état">Très bon état</option>
              <option value="service">Service</option>
              <option value="frais">Frais</option>
            </select>
          </div>
          <div class="field">
            <label for="browse-price">Prix</label>
            <select id="browse-price">
              <option value="all">Tous les prix</option>
              <option value="0-100000">0 - 100 000 CDF</option>
              <option value="100001-500000">100 001 - 500 000 CDF</option>
              <option value="500001-2000000">500 001 - 2 000 000 CDF</option>
              <option value="2000001-999999999">2 000 001 CDF ou plus</option>
            </select>
          </div>
          <div class="field">
            <label for="browse-sort">Tri</label>
            <select id="browse-sort">
              <option value="recent">Plus récents</option>
              <option value="cheap">Prix croissant</option>
              <option value="expensive">Prix décroissant</option>
              <option value="featured">Boostées d'abord</option>
            </select>
          </div>
        </aside>

        <div class="browse-results">
          <div class="chip-row">${chips}</div>
          <div class="browse-results__header">
            <div>
              <p class="eyebrow">10 catégories</p>
              <h2 id="results-summary" aria-live="polite">8 annonces visibles</h2>
            </div>
            <a class="button button--ghost" href="/ambassadeur/">Devenir ambassadeur</a>
          </div>
          <div class="listing-grid" id="browse-results-grid">${cards}</div>
        </div>
      </section>
    </main>
  `;

  return renderLayout({
    currentPath: '/annonces/',
    title: `Annonces Zwibba | ${site.market}`,
    description:
      "Parcourez les annonces Zwibba : catégories, filtres, prix en CDF et fiches d'annonce faciles à partager.",
    body,
    schema,
  });
}

function renderListingPage(listing) {
  const similar = listings
    .filter((item) => item.slug !== listing.slug && item.category === listing.category)
    .slice(0, 2)
    .map((item) => renderListingCard(item, { highlightLabel: 'Similaire' }))
    .join('');

  const schema = {
    '@context': 'https://schema.org',
    '@type': listing.listingType === 'Service' ? 'Service' : 'Product',
    name: listing.title,
    description: listing.summary,
    image: resolveUrl(`/assets/listings/${listing.slug}.svg`),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'CDF',
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
          <img src="/assets/listings/${listing.slug}.svg" alt="${escapeHtml(listing.title)}" width="1200" height="800" />
        </div>
        <div class="listing-hero__content">
          <div class="meta-pill-row">
            <span class="meta-pill">${escapeHtml(listing.categoryLabel)}</span>
            <span class="meta-pill">${escapeHtml(listing.transactionType)}</span>
            <span class="meta-pill">${escapeHtml(listing.condition)}</span>
          </div>
          <h1>${escapeHtml(listing.title)}</h1>
          <p class="listing-hero__price">${escapeHtml(formatCdf(listing.priceCdf))}</p>
          <p class="listing-hero__summary">${escapeHtml(listing.summary)}</p>
          <div class="detail-actions">
            <button class="button button--primary" type="button" data-gated="call">${icon('phone')} Appeler</button>
            <button class="button button--ghost" type="button" data-gated="whatsapp">WhatsApp</button>
            <button class="button button--ghost" type="button" data-gated="sms">SMS</button>
            <button class="button button--ghost" type="button" data-share-button data-share-title="${escapeHtml(
              listing.title,
            )}" data-share-url="${resolveUrl(`/annonce/${listing.slug}/`)}">${icon('share')} Partager</button>
          </div>
          <p class="detail-note">${icon('shield')} Ouvrez l'application pour voir les coordonnées complètes et contacter le vendeur en sécurité.</p>
        </div>
      </section>

      <section class="section listing-detail-layout">
        <div class="listing-story">
          <article class="detail-card">
            <p class="eyebrow">Description</p>
            ${listing.description.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
          </article>
          <article class="detail-card">
            <p class="eyebrow">Caractéristiques</p>
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
            <p class="eyebrow">Conseils de sécurité</p>
            <ul class="safety-list">${renderSafetyTips()}</ul>
          </article>
        </div>

        <aside class="listing-sidebar">
          <article class="detail-card">
            <p class="eyebrow">Vendeur</p>
            <h2>${escapeHtml(listing.seller.name)}</h2>
            <p>${escapeHtml(listing.seller.role)}</p>
            <ul class="seller-facts">
              <li>${escapeHtml(listing.seller.memberSince)}</li>
              <li>${escapeHtml(listing.seller.listings)}</li>
              <li>${escapeHtml(listing.seller.responseTime)}</li>
              <li>${escapeHtml(listing.neighborhood)}, ${escapeHtml(listing.city)}</li>
            </ul>
            <button class="button button--primary button--block" type="button" data-gated="seller-profile">Voir dans l'application</button>
          </article>
          <article class="detail-card">
            <p class="eyebrow">Partage</p>
            <p>Cette page est faite pour être claire et facile à partager. Pour les actions sensibles, passez par l'application.</p>
            <button class="button button--ghost button--block" type="button" data-share-button data-share-title="${escapeHtml(
              listing.title,
            )}" data-share-url="${resolveUrl(`/annonce/${listing.slug}/`)}">Copier le lien</button>
          </article>
        </aside>
      </section>

      <section class="section section--dense">
        <div class="section__heading">
          <p class="eyebrow">Dans la même catégorie</p>
          <h2>Autres annonces ${escapeHtml(listing.categoryLabel.toLowerCase())}</h2>
        </div>
        <div class="listing-grid">${similar}</div>
      </section>
    </main>
  `;

  return renderLayout({
    currentPath: `/annonce/${listing.slug}/`,
    canonicalPath: `/annonce/${listing.slug}/`,
    title: `${listing.title} | Zwibba`,
    description: listing.summary,
    ogImage: `/assets/listings/${listing.slug}.svg`,
    body: detailBody,
    schema,
    bodyClass: 'page-listing',
  });
}

function renderAmbassadorPage() {
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

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Programme ambassadeur Zwibba',
    description:
      "Expliquez le programme ambassadeur Zwibba, récupérez un code de parrainage et poussez l'installation dans l'application.",
    url: resolveUrl('/ambassadeur/'),
  };

  const body = `
    <main id="main-content">
      <section class="page-hero">
        <div>
          <p class="eyebrow">Programme ambassadeur</p>
          <h1>Chaque groupe de 10 parrainages validés débloque un nouveau boost.</h1>
          <p>Le site explique le programme, récupère le code de parrainage et renvoie ensuite vers l'application pour le suivi.</p>
        </div>
        <div class="referral-panel">
          <p class="referral-panel__label">Code actuel</p>
          <strong id="referral-code-output">ZWIB-A3K9</strong>
          <p>Partagez un lien simple, puis laissez l'application confirmer les inscriptions et les annonces validées.</p>
          <div class="referral-input-group">
            <label for="referral-code-input">Code de parrainage</label>
            <input id="referral-code-input" type="text" placeholder="ZWIB-A3K9" autocomplete="off" spellcheck="false" />
          </div>
          <div class="store-row store-row--stacked">${renderStoreButtons()}</div>
          <button class="button button--ghost button--block" type="button" data-copy-referral>Copier mon lien</button>
        </div>
      </section>

      <section class="section">
        <div class="section__heading">
          <p class="eyebrow">Comment ça marche</p>
          <h2>Un parcours simple, clair et adapté aux canaux locaux.</h2>
        </div>
        <div class="step-grid">
          <article class="step-card">
            <span class="step-card__index">01</span>
            <h3>Créez un compte vendeur</h3>
            <p>Un numéro vérifié et une première annonce publiée suffisent pour commencer.</p>
          </article>
          <article class="step-card">
            <span class="step-card__index">02</span>
            <h3>Partagez votre lien</h3>
            <p>WhatsApp passe en premier, mais Facebook, Instagram et TikTok ont aussi leur place.</p>
          </article>
          <article class="step-card">
            <span class="step-card__index">03</span>
            <h3>Débloquez les récompenses</h3>
            <p>Toutes les 10 inscriptions validées, un avantage ambassadeur arrive automatiquement.</p>
          </article>
        </div>
      </section>

      <section class="section section--accent">
        <div class="section__heading">
          <p class="eyebrow">Canaux de partage</p>
          <h2>Conçu pour les habitudes de partage locales.</h2>
        </div>
        <div class="channel-grid">${channels}</div>
      </section>

      <section class="section section--dense">
        <div class="cta-panel">
          <div>
            <p class="eyebrow">Parrainage</p>
            <h2>Le site récupère le code. L'application gère ensuite le suivi et les récompenses.</h2>
          </div>
          <div class="store-row">${renderStoreButtons()}</div>
        </div>
      </section>
    </main>
  `;

  return renderLayout({
    currentPath: '/ambassadeur/',
    title: 'Programme ambassadeur Zwibba',
    description:
      "Expliquez le programme ambassadeur Zwibba, récupérez un code de parrainage et poussez l'installation dans l'application.",
    body,
    schema,
  });
}

function renderAboutPage() {
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
    name: 'À propos de Zwibba',
    description:
      'Découvrez la vision de Zwibba, une place de marché pensée pour Lubumbashi et pour les usages réels du marché congolais.',
    url: resolveUrl('/a-propos/'),
  };

  const body = `
    <main id="main-content">
      <section class="page-hero">
        <div>
          <p class="eyebrow">À propos</p>
          <h1>Zwibba construit un marché local, mobile et utile dès le premier usage.</h1>
          <p>Le produit est pensé pour Lubumbashi. Il aide à vendre vite, reste simple à comprendre et fonctionne bien même sur un réseau lent.</p>
        </div>
      </section>

      <section class="section">
        <div class="section__heading">
          <p class="eyebrow">Trois principes</p>
          <h2>Ce qui tient la marque et le produit ensemble.</h2>
        </div>
        <div class="highlight-grid">${values}</div>
      </section>

      <section class="section section--accent">
        <div class="section__heading">
          <p class="eyebrow">Contexte</p>
          <h2>Lubumbashi d'abord, Congo ensuite.</h2>
          <p>Prix en CDF, catégories claires, quartier comme filtre et partage WhatsApp par défaut : le site montre le vrai contexte local.</p>
        </div>
        <div class="note-card-grid">
          <article class="note-card">
            <h3>IA utile</h3>
            <p>Titre, description, catégorie et prix conseillé doivent vraiment faire gagner du temps.</p>
          </article>
          <article class="note-card">
            <h3>Prévu pour les réseaux lents</h3>
            <p>Le site garde des pages légères et reste utile même quand la connexion est faible.</p>
          </article>
          <article class="note-card">
            <h3>Confiance par couches</h3>
            <p>Le site aide à découvrir. L'application protège les échanges et le contact.</p>
          </article>
        </div>
      </section>
    </main>
  `;

  return renderLayout({
    currentPath: '/a-propos/',
    title: 'À propos de Zwibba',
    description: 'Découvrez la vision de Zwibba, une place de marché pensée pour Lubumbashi et pour les usages réels du marché congolais.',
    body,
    schema,
  });
}

function renderContactPage() {
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

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact Zwibba',
    description: 'Contactez Zwibba pour le support, les partenariats ou le lancement du produit.',
    url: resolveUrl('/contact/'),
  };

  const body = `
    <main id="main-content">
      <section class="page-hero">
        <div>
          <p class="eyebrow">Contact</p>
          <h1>Besoin de parler lancement, support ou partenariat ?</h1>
          <p>Le site reste volontairement léger. Pour une demande précise, envoyez un message clair et nous vous répondrons rapidement.</p>
        </div>
      </section>

      <section class="section">
        <div class="support-grid">${topics}</div>
      </section>

      <section class="section section--accent">
        <div class="contact-layout">
          <article class="detail-card">
            <p class="eyebrow">Formulaire direct</p>
            <form id="contact-form" class="contact-form">
              <label>
                Nom
                <input type="text" name="name" placeholder="Votre nom" autocomplete="name" required />
              </label>
              <label>
                Email
                <input type="email" name="email" placeholder="vous@exemple.com" autocomplete="email" required />
              </label>
              <label>
                Sujet
                <input type="text" name="topic" placeholder="Partenariat, support, lancement..." autocomplete="organization-title" required />
              </label>
              <label>
                Message
                <textarea name="message" rows="6" placeholder="Expliquez simplement votre besoin." required></textarea>
              </label>
              <button class="button button--primary" type="submit">Envoyer par e-mail</button>
            </form>
          </article>
          <article class="detail-card">
            <p class="eyebrow">Coordonnées</p>
            <h2>${escapeHtml(site.supportEmail)}</h2>
            <p>Pour l'instant, le support principal passe par e-mail pour garder les demandes claires.</p>
            <ul class="seller-facts">
              <li>${escapeHtml(site.market)}</li>
              <li>Réponse sous 48h ouvrées</li>
              <li>Support produit, partenariats, lancement</li>
            </ul>
            <div class="faq-stack">${renderFaqs(faqs.slice(0, 2))}</div>
          </article>
        </div>
      </section>
    </main>
  `;

  return renderLayout({
    currentPath: '/contact/',
    title: 'Contact Zwibba',
    description: 'Contactez Zwibba pour le support, les partenariats ou le lancement du produit.',
    body,
    schema,
  });
}

function renderReferralPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Parrainage Zwibba',
    description: 'Redirection des codes ambassadeur Zwibba vers la bonne page de téléchargement.',
    url: resolveUrl('/r/'),
  };

  const body = `
    <main id="main-content">
      <section class="page-hero page-hero--referral">
        <div class="referral-redirect">
          <p class="eyebrow">Redirection</p>
          <h1>Transmission du code en cours…</h1>
          <p>Nous préparons votre code de parrainage et les liens de téléchargement.</p>
          <strong id="referral-code-output">ZWIB-A3K9</strong>
          <a class="button button--primary" id="referral-fallback-link" href="/ambassadeur/">Continuer vers l'ambassadeur</a>
        </div>
      </section>
    </main>
  `;

  return renderLayout({
    currentPath: '/r/',
    title: 'Parrainage Zwibba',
    description: 'Redirection des codes ambassadeur Zwibba vers la bonne page de téléchargement.',
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

function buildRobots() {
  return `User-agent: *
Allow: /

Sitemap: ${resolveUrl('/sitemap.xml')}
`;
}

function build() {
  rmSync(distDir, { recursive: true, force: true });
  ensureDir(assetsDir);

  cpSync(path.join(repoRoot, 'Logo_zwibba.svg'), path.join(assetsDir, 'brand', 'logo-zwibba.svg'), { recursive: false });
  writeText(path.join(assetsDir, 'brand', 'favicon.svg'), renderFavicon());
  writeText(path.join(assetsDir, 'styles.css'), readFileSync(path.join(repoRoot, 'src/site/styles.css'), 'utf8'));
  writeText(path.join(assetsDir, 'app.js'), readFileSync(path.join(repoRoot, 'src/site/app.js'), 'utf8'));
  cpSync(path.join(repoRoot, 'App'), path.join(assetsDir, 'app'), { recursive: true });

  for (const listing of listings) {
    writeText(path.join(assetsDir, 'listings', `${listing.slug}.svg`), buildListingImage(listing));
  }

  const appPage = renderAppPage();
  const pages = [
    { file: 'index.html', path: '/', html: renderLandingPage() },
    { file: 'App/index.html', path: '/App/', html: appPage },
    { file: 'annonces/index.html', path: '/annonces/', html: renderBrowsePage() },
    { file: 'ambassadeur/index.html', path: '/ambassadeur/', html: renderAmbassadorPage() },
    { file: 'a-propos/index.html', path: '/a-propos/', html: renderAboutPage() },
    { file: 'contact/index.html', path: '/contact/', html: renderContactPage() },
    { file: 'r/index.html', path: '/r/', html: renderReferralPage() },
    ...listings.map((listing) => ({
      file: `annonce/${listing.slug}/index.html`,
      path: `/annonce/${listing.slug}/`,
      html: renderListingPage(listing),
    })),
  ];

  pages.forEach((page) => writeText(path.join(distDir, page.file), page.html));

  writeText(path.join(distDir, 'sitemap.xml'), buildSitemap(pages.map((page) => resolveUrl(page.path))));
  writeText(path.join(distDir, 'robots.txt'), buildRobots());
}

build();
