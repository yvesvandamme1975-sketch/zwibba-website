import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, devices } from 'playwright';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const LIVE_APP_BASE_URL =
  process.env.ZWIBBA_LIVE_APP_URL || 'https://website-production-7a12.up.railway.app/App/';
export const DEFAULT_SELLER_PHONE =
  process.env.ZWIBBA_E2E_SELLER_PHONE || '+243990000001';
export const DEFAULT_BUYER_PHONE =
  process.env.ZWIBBA_E2E_BUYER_PHONE || '+243990000002';
export const DEFAULT_OTP_CODE =
  process.env.ZWIBBA_E2E_OTP_CODE || '123456';
export const DEFAULT_PROFILE_AREA =
  process.env.ZWIBBA_E2E_PROFILE_AREA || 'Golf';
export const DEFAULT_TEST_IMAGE_PATH =
  process.env.ZWIBBA_E2E_IMAGE_PATH ||
  path.join(repoRoot, 'public', 'assets', 'listings', 'ordinateur-portable-hp-elitebook.jpg');

function normalizeHash(hash = '#sell') {
  const value = String(hash || '').trim();
  return value.startsWith('#') ? value : `#${value}`;
}

export function buildAppUrl(hash = '#sell') {
  return `${LIVE_APP_BASE_URL}${normalizeHash(hash)}`;
}

export function extractAppRoute(url) {
  const routeUrl = new URL(url);
  const hash = routeUrl.hash.replace(/^#/, '');
  const [type = 'sell', ...parts] = hash.split('/');

  return {
    type,
    value: decodeURIComponent(parts.join('/')),
  };
}

function isIgnorableR2Failure(request) {
  const url = String(request?.url || '');
  const errorText = String(request?.errorText || '');
  const method = String(request?.method || '').toUpperCase();
  const isAbort = /ERR_ABORTED/u.test(errorText);
  const isR2Like = /cloudflarestorage|r2|draft-photos|cdn\./iu.test(url);

  return isAbort && isR2Like && (method === 'PUT' || method === 'HEAD');
}

export function classifyUploadOutcome({
  failedRequests = [],
  imageRendered = false,
  objectReachable = false,
  uploadSlotIssued = false,
} = {}) {
  const blockingFailures = failedRequests.filter((request) => !isIgnorableR2Failure(request));

  if (!uploadSlotIssued) {
    return {
      blockingFailures,
      ok: false,
      reason: 'Le flux n’a pas obtenu de slot de téléversement.',
    };
  }

  if (!objectReachable) {
    return {
      blockingFailures,
      ok: false,
      reason: 'L’objet téléversé n’est pas reachable publiquement.',
    };
  }

  if (!imageRendered) {
    return {
      blockingFailures,
      ok: false,
      reason: 'L’image téléversée ne s’est pas rendue dans l’UI.',
    };
  }

  if (blockingFailures.length > 0) {
    return {
      blockingFailures,
      ok: false,
      reason: 'Des requêtes bloquantes ont échoué pendant le flux.',
    };
  }

  return {
    blockingFailures: [],
    ok: true,
    reason: '',
  };
}

function resolveDeviceContextOptions(deviceName = 'desktop') {
  if (deviceName === 'iphone') {
    return devices['iPhone 13'] || {
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    };
  }

  if (deviceName === 'android') {
    return devices['Pixel 7'] ||
      devices['Pixel 5'] || {
        hasTouch: true,
        isMobile: true,
        viewport: { width: 412, height: 915 },
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      };
  }

  return {
    viewport: { width: 1440, height: 1100 },
  };
}

export async function openLiveApp({
  deviceName = 'desktop',
  hash = '#sell',
} = {}) {
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
  });
  const context = await browser.newContext({
    ...resolveDeviceContextOptions(deviceName),
  });
  const page = await context.newPage();
  const failedRequests = [];
  const requestLog = [];

  page.on('request', (request) => {
    requestLog.push({
      method: request.method(),
      url: request.url(),
    });
  });

  page.on('requestfailed', (request) => {
    failedRequests.push({
      errorText: request.failure()?.errorText || '',
      method: request.method(),
      url: request.url(),
    });
  });

  page.on('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.goto(buildAppUrl(hash), {
    waitUntil: 'networkidle',
  });

  return {
    browser,
    context,
    failedRequests,
    page,
    requestLog,
  };
}

export async function closeLiveApp(app) {
  await app?.browser?.close();
}

export async function waitForHashRoute(page, expectedHashPrefix, timeout = 30000) {
  await page.waitForFunction(
    (prefix) => window.location.hash.startsWith(prefix),
    expectedHashPrefix,
    {
      timeout,
    },
  );
}

export async function waitForImageReady(page, selector, timeout = 30000) {
  const locator = page.locator(selector).first();

  await locator.waitFor({
    state: 'visible',
    timeout,
  });

  await page.waitForFunction(
    (element) => {
      return Boolean(
        element &&
          element.complete &&
          typeof element.naturalWidth === 'number' &&
          element.naturalWidth > 0,
      );
    },
    await locator.elementHandle(),
    {
      timeout,
    },
  );

  return locator;
}

export async function authenticateViaProfile(page, {
  area = DEFAULT_PROFILE_AREA,
  phoneNumber = DEFAULT_SELLER_PHONE,
  otpCode = DEFAULT_OTP_CODE,
} = {}) {
  await page.goto(buildAppUrl('#profile'), {
    waitUntil: 'networkidle',
  });

  if (await page.getByText('Profil verrouillé').count()) {
    await page.getByRole('link', { name: 'Commencer la vérification' }).click();
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Continuer avec mon numéro' }).click();
    await page.getByLabel('Numéro de téléphone').fill(phoneNumber);
    await page.getByRole('button', { name: 'Recevoir le code' }).click();
    await page.getByLabel('Code à 6 chiffres').fill(otpCode);
    await page.getByRole('button', { name: 'Vérifier et continuer' }).click();
    await waitForHashRoute(page, '#profile');
  }

  const areaSelect = page.locator('form[data-form="profile-zone"] select[name="area"]');

  await areaSelect.selectOption({
    label: area,
  });
  await page.getByRole('button', { name: /Enregistrer ma zone|Enregistrement/u }).click();
  await page.getByText('Zone enregistrée', { exact: true }).waitFor({
    timeout: 30000,
  });
}

export async function fillFirstPhoto(page, filePath = DEFAULT_TEST_IMAGE_PATH) {
  const input = page.locator('input[data-input="capture-first-photo"]');
  await input.setInputFiles(filePath);
}

export async function fillReviewDraft(page, {
  description,
  priceCdf = '450000',
  title,
} = {}) {
  if (title) {
    await page.locator('input[name="title"]').fill(title);
  }

  if (description) {
    await page.locator('textarea[name="description"]').fill(description);
  }

  await page.locator('input[name="priceCdf"]').fill(priceCdf);
}

export async function reachabilityCheck(url) {
  try {
    const headResponse = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (headResponse.ok) {
      return true;
    }
  } catch {}

  try {
    const getResponse = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    return getResponse.ok;
  } catch {
    return false;
  }
}
