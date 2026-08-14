import { compareListingsByPrice } from './listing-sort.mjs';

const gate = document.querySelector('#download-gate');
const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const announcer = document.querySelector('#site-announcer');

// Fallback strings match the current French (fr-CD) copy so the site keeps
// working even if window.ZWIBBA_UI_STRINGS isn't injected by the build.
const fallbackUiStrings = {
  lang: 'fr',
  menu: {
    opened: 'Menu ouvert',
    closed: 'Menu fermé',
  },
  copyLink: {
    toastLabel: 'Lien copié',
    announce: 'Lien copié dans le presse-papiers',
    prompt: 'Copiez ce lien',
  },
  referral: {
    toastLabel: 'Lien ambassadeur copié',
    announce: 'Lien ambassadeur copié',
  },
  mailto: {
    nameLabel: 'Nom',
    emailLabel: 'Email',
  },
  currency: 'CDF',
  results: {
    one: '{count} annonce visible',
    other: '{count} annonces visibles',
  },
};

const uiStrings =
  (typeof window !== 'undefined' && window.ZWIBBA_UI_STRINGS) || fallbackUiStrings;
const localCurrency = String(uiStrings.currency || fallbackUiStrings.currency || 'CDF').toUpperCase();

function formatResultsSummary(count) {
  const rules = new Intl.PluralRules(uiStrings.lang || fallbackUiStrings.lang);
  const category = rules.select(count);
  const template =
    (uiStrings.results && uiStrings.results[category]) ||
    (uiStrings.results && uiStrings.results.other) ||
    fallbackUiStrings.results[category] ||
    fallbackUiStrings.results.other;

  return template.replace('{count}', String(count));
}

// Duplicated locally from scripts/build.mjs (no bundler to share code between
// the Node build step and this browser-loaded script).
function conditionCode(label) {
  return String(label)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Duplicated locally from App/services/country-preference.mjs (no bundler to
// share code between the app and the marketing site scripts).
function readGeoCookie(cookieString) {
  const match = /(?:^|;\s*)zwibba_geo=([A-Z]{2})(?:;|$)/.exec(cookieString ?? '');
  return match ? match[1] : null;
}

const SITE_COUNTRY_STORAGE_KEY = 'zwibba_site_country';

function getStoredSiteCountry() {
  try {
    return window.localStorage.getItem(SITE_COUNTRY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredSiteCountry(countryCode) {
  try {
    window.localStorage.setItem(SITE_COUNTRY_STORAGE_KEY, countryCode);
  } catch {
    // stockage indisponible : préférence non persistée, sans erreur
  }
}

function announce(message) {
  if (!announcer) {
    return;
  }

  announcer.textContent = '';
  window.setTimeout(() => {
    announcer.textContent = message;
  }, 20);
}

function getReferralCode() {
  const url = new URL(window.location.href);
  const queryCode = url.searchParams.get('ref');

  if (queryCode) {
    return queryCode.toUpperCase();
  }

  const pathMatch = window.location.pathname.match(/^\/r\/([^/]+)\/?$/);
  if (pathMatch) {
    return decodeURIComponent(pathMatch[1]).toUpperCase();
  }

  return window.localStorage.getItem('zwibba_referral_code') || '';
}

function setReferralCode(code) {
  if (!code) {
    return;
  }

  window.localStorage.setItem('zwibba_referral_code', code);

  document.querySelectorAll('#referral-code-output').forEach((element) => {
    element.textContent = code;
  });

  const input = document.querySelector('#referral-code-input');
  if (input && !input.value) {
    input.value = code;
  }

  document.querySelectorAll('[data-store-link]').forEach((link) => {
    try {
      const url = new URL(link.href);
      url.searchParams.set('ref', code);
      url.searchParams.set('utm_source', 'zwibba-website');
      link.href = url.toString();
    } catch {
      // ignore malformed external hrefs
    }
  });

  const fallbackLink = document.querySelector('#referral-fallback-link');
  if (fallbackLink) {
    fallbackLink.href = `/ambassadeur/?ref=${encodeURIComponent(code)}`;
  }
}

function openGate() {
  if (gate && typeof gate.showModal === 'function') {
    gate.showModal();
  }
}

function closeGate() {
  if (gate && gate.open) {
    gate.close();
  }
}

function initGate() {
  document.querySelectorAll('[data-gated]').forEach((element) => {
    element.addEventListener('click', (event) => {
      event.preventDefault();
      openGate();
    });
  });

  document.querySelectorAll('[data-close-gate]').forEach((element) => {
    element.addEventListener('click', () => closeGate());
  });

  if (gate) {
    gate.addEventListener('click', (event) => {
      const rect = gate.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!inside) {
        closeGate();
      }
    });
  }
}

function initMenu() {
  if (!menuToggle || !siteNav) {
    return;
  }

  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    siteNav.classList.toggle('is-open', !isOpen);
    announce(!isOpen ? uiStrings.menu.opened : uiStrings.menu.closed);
  });
}

function initBrowseFilters() {
  const grid = document.querySelector('#browse-results-grid');
  if (!grid) {
    return;
  }

  const cards = Array.from(grid.querySelectorAll('[data-listing-card]'));
  const summary = document.querySelector('#results-summary');
  const search = document.querySelector('#browse-search');
  const category = document.querySelector('#browse-category');
  const condition = document.querySelector('#browse-condition');
  const price = document.querySelector('#browse-price');
  const sort = document.querySelector('#browse-sort');
  const chips = Array.from(document.querySelectorAll('[data-chip]'));
  const url = new URL(window.location.href);

  if (search && url.searchParams.get('q')) {
    search.value = url.searchParams.get('q');
  }
  if (category && url.searchParams.get('category')) {
    category.value = url.searchParams.get('category');
  }
  if (condition && url.searchParams.get('condition')) {
    condition.value = url.searchParams.get('condition');
  }
  if (price && url.searchParams.get('price')) {
    price.value = url.searchParams.get('price');
  }
  if (sort && url.searchParams.get('sort')) {
    sort.value = url.searchParams.get('sort');
  }

  function matchesFilters(card) {
    const title = card.dataset.title || '';
    const cardCategory = card.dataset.category || '';
    const cardCondition = card.dataset.condition || '';
    const cardPrice = Number(card.dataset.price || '0');
    const cardCurrency = String(card.dataset.currency || localCurrency).toUpperCase();
    const searchValue = search ? search.value.trim().toLowerCase() : '';
    const categoryValue = category ? category.value : 'all';
    const conditionValue = condition ? condition.value : 'all';
    const priceValue = price ? price.value : 'all';

    const searchMatch = !searchValue || title.includes(searchValue);
    const categoryMatch = categoryValue === 'all' || cardCategory === categoryValue;
    const conditionMatch = conditionValue === 'all' || cardCondition === conditionCode(conditionValue);

    let priceMatch = true;
    if (priceValue !== 'all') {
      const [min, max] = priceValue.split('-').map((value) => Number(value));
      // Price filters are denominated in the locale currency; cards in other currencies are hidden while a price filter is active.
      priceMatch = cardCurrency === localCurrency && cardPrice >= min && cardPrice <= max;
    }

    return searchMatch && categoryMatch && conditionMatch && priceMatch;
  }

  function sortCards(visibleCards) {
    const sortValue = sort ? sort.value : 'recent';
    const sorted = [...visibleCards];

    if (sortValue === 'cheap') {
      sorted.sort((left, right) => compareListingsByPrice(
        { price: left.dataset.price, currency: left.dataset.currency },
        { price: right.dataset.price, currency: right.dataset.currency },
        { localCurrency, direction: 'asc' },
      ));
    } else if (sortValue === 'expensive') {
      sorted.sort((left, right) => compareListingsByPrice(
        { price: left.dataset.price, currency: left.dataset.currency },
        { price: right.dataset.price, currency: right.dataset.currency },
        { localCurrency, direction: 'desc' },
      ));
    } else if (sortValue === 'featured') {
      sorted.sort((left, right) => {
        const leftFeatured = left.querySelector('.listing-card__badge') ? 1 : 0;
        const rightFeatured = right.querySelector('.listing-card__badge') ? 1 : 0;
        return rightFeatured - leftFeatured;
      });
    }

    sorted.forEach((card) => grid.appendChild(card));
  }

  function applyFilters() {
    const visibleCards = [];

    cards.forEach((card) => {
      const visible = matchesFilters(card);
      card.hidden = !visible;
      if (visible) {
        visibleCards.push(card);
      }
    });

    sortCards(visibleCards);

    if (summary) {
      summary.textContent = formatResultsSummary(visibleCards.length);
    }

    const nextUrl = new URL(window.location.href);
    const values = [
      ['q', search?.value.trim()],
      ['category', category?.value !== 'all' ? category?.value : ''],
      ['condition', condition?.value !== 'all' ? condition?.value : ''],
      ['price', price?.value !== 'all' ? price?.value : ''],
      ['sort', sort?.value !== 'recent' ? sort?.value : ''],
    ];

    values.forEach(([key, value]) => {
      if (value) {
        nextUrl.searchParams.set(key, value);
      } else {
        nextUrl.searchParams.delete(key);
      }
    });

    window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}`);
  }

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((item) => item.classList.remove('is-active'));
      chip.classList.add('is-active');
      if (category) {
        category.value = chip.dataset.chip;
      }
      applyFilters();
    });
  });

  if (category) {
    chips.forEach((chip) => {
      chip.classList.toggle('is-active', chip.dataset.chip === category.value);
    });
    if (category.value === 'all' && chips[0]) {
      chips[0].classList.add('is-active');
    }
  }

  [search, category, condition, price, sort].forEach((field) => {
    if (field) {
      field.addEventListener('input', applyFilters);
      field.addEventListener('change', applyFilters);
    }
  });

  applyFilters();
}

function initShareButtons() {
  document.querySelectorAll('[data-share-button]').forEach((button) => {
    button.addEventListener('click', async () => {
      const title = button.dataset.shareTitle || document.title;
      const url = button.dataset.shareUrl || window.location.href;

      if (navigator.share) {
        try {
          await navigator.share({ title, url });
          return;
        } catch {
          // fall through to clipboard
        }
      }

      try {
        await navigator.clipboard.writeText(url);
        button.textContent = uiStrings.copyLink.toastLabel;
        announce(uiStrings.copyLink.announce);
      } catch {
        window.prompt(uiStrings.copyLink.prompt, url);
      }
    });
  });
}

function initReferralPages() {
  const code = getReferralCode();
  if (code) {
    setReferralCode(code);
  }

  const copyButton = document.querySelector('[data-copy-referral]');
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      const activeCode = (document.querySelector('#referral-code-input')?.value || code || 'ZWIB-A3K9').toUpperCase();
      setReferralCode(activeCode);
      const referralUrl = `${window.location.origin}/r/${encodeURIComponent(activeCode)}`;

      try {
        await navigator.clipboard.writeText(referralUrl);
        copyButton.textContent = uiStrings.referral.toastLabel;
        announce(uiStrings.referral.announce);
      } catch {
        window.prompt(uiStrings.copyLink.prompt, referralUrl);
      }
    });
  }

  const referralInput = document.querySelector('#referral-code-input');
  if (referralInput) {
    referralInput.addEventListener('input', () => {
      const nextCode = referralInput.value.trim().toUpperCase();
      setReferralCode(nextCode);
    });
  }

  if (window.location.pathname.startsWith('/r/')) {
    const activeCode = code || 'ZWIB-A3K9';
    setReferralCode(activeCode);

    window.setTimeout(() => {
      window.location.href = `/ambassadeur/?ref=${encodeURIComponent(activeCode)}`;
    }, 1800);
  }
}

function createGeoBanner(geoBanner) {
  const banner = document.createElement('div');
  banner.className = 'geo-banner';
  banner.setAttribute('data-geo-banner', '');
  banner.setAttribute('role', 'region');

  const text = document.createElement('p');
  text.className = 'geo-banner__text';
  text.textContent = geoBanner.text;

  const actions = document.createElement('div');
  actions.className = 'geo-banner__actions';

  const cta = document.createElement('a');
  cta.className = 'button button--primary geo-banner__cta';
  cta.href = '/be/';
  cta.textContent = geoBanner.cta;
  cta.addEventListener('click', () => {
    setStoredSiteCountry('BE');
  });

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'geo-banner__dismiss';
  dismiss.textContent = geoBanner.dismiss;
  dismiss.addEventListener('click', () => {
    setStoredSiteCountry('CD');
    banner.remove();
  });

  actions.append(cta, dismiss);
  banner.append(text, actions);

  return banner;
}

function initGeoBanner() {
  const geoBanner = uiStrings.geoBanner;
  if (!geoBanner) {
    return;
  }

  // The banner only suggests the belgian site from the fr-CD (unprefixed)
  // pages; /be/ and /be/nl/ are already the belgian versions.
  if (window.location.pathname.startsWith('/be')) {
    return;
  }

  let geoCountry = null;
  try {
    geoCountry = readGeoCookie(document.cookie);
  } catch {
    geoCountry = null;
  }

  if (geoCountry !== 'BE') {
    return;
  }

  if (getStoredSiteCountry() !== null) {
    return;
  }

  document.body.prepend(createGeoBanner(geoBanner));
}

function initContactForm() {
  const form = document.querySelector('#contact-form');
  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const topic = String(formData.get('topic') || '').trim();
    const message = String(formData.get('message') || '').trim();
    const body = [
      `${uiStrings.mailto.nameLabel}: ${name}`,
      `${uiStrings.mailto.emailLabel}: ${email}`,
      '',
      message,
    ].join('\n');
    const mailto = `mailto:support@zwibba.com?subject=${encodeURIComponent(topic)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  });
}

initMenu();
initGate();
initBrowseFilters();
initShareButtons();
initReferralPages();
initContactForm();
initGeoBanner();
