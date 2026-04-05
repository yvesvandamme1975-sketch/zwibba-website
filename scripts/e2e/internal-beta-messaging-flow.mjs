import assert from 'node:assert/strict';

import {
  DEFAULT_BUYER_PHONE,
  DEFAULT_SELLER_PHONE,
  DEFAULT_OTP_CODE,
  authenticateViaProfile,
  closeLiveApp,
  extractAppRoute,
  openLiveApp,
  waitForHashRoute,
} from './live-beta-helpers.mjs';

async function authenticateFromListingMessage(page, {
  phoneNumber,
  otpCode = DEFAULT_OTP_CODE,
} = {}) {
  await page.getByRole('button', { name: 'Envoyer un message' }).click();

  if (extractAppRoute(page.url()).type === 'auth-welcome') {
    await page.getByRole('link', { name: 'Continuer avec mon numéro' }).click();
    await page.getByLabel('Numéro de téléphone').fill(phoneNumber);
    await page.getByRole('button', { name: 'Recevoir le code' }).click();
    await page.getByLabel('Code à 6 chiffres').fill(otpCode);
    await page.getByRole('button', { name: 'Vérifier et continuer' }).click();
  }

  await waitForHashRoute(page, '#thread/');
}

export async function runMessagingFlow({
  buyerPhone = DEFAULT_BUYER_PHONE,
  sellerPhone = DEFAULT_SELLER_PHONE,
} = {}) {
  const logStep = (label) => {
    console.error(`[messages-e2e] ${label}`);
  };
  const sellerApp = await openLiveApp({
    deviceName: 'desktop',
    hash: '#profile',
  });
  let sellerListing;

  try {
    logStep('authenticate seller profile');
    await authenticateViaProfile(sellerApp.page, {
      phoneNumber: sellerPhone,
    });
    logStep('open seller listing from profile');
    const listingCard = sellerApp.page.locator('section.app-profile__lifecycle-section a[href^="#listing/"]').first();
    await listingCard.waitFor({
      state: 'visible',
      timeout: 30000,
    });
    const listingHref = await listingCard.getAttribute('href');
    assert.ok(listingHref, 'Le seller doit avoir au moins une annonce active publique.');
    await listingCard.click();
    await waitForHashRoute(sellerApp.page, '#listing/');

    sellerListing = {
      listingSlug: extractAppRoute(sellerApp.page.url()).value,
      listingTitle:
        (await sellerApp.page.locator('.app-flow--detail .app-flow__title').textContent())?.trim() || '',
    };

    logStep('open buyer listing');
    const buyerApp = await openLiveApp({
      deviceName: 'desktop',
      hash: `#listing/${sellerListing.listingSlug}`,
    });

    try {
      logStep('authenticate buyer from listing');
      await authenticateFromListingMessage(buyerApp.page, {
        phoneNumber: buyerPhone,
      });

      const buyerMessage = `Bonjour depuis la beta ${Date.now()}`;
      logStep('send buyer message');
      await buyerApp.page.locator('input[name="threadMessage"]').fill(buyerMessage);
      await buyerApp.page.getByRole('button', { name: 'Envoyer' }).click();
      await buyerApp.page.getByText(buyerMessage).waitFor({
        timeout: 30000,
      });

      logStep('open seller inbox');
      await sellerApp.page.goto(`${sellerApp.page.url().split('#')[0]}#messages`, {
        waitUntil: 'domcontentloaded',
      });
      const sellerThreadCard = sellerApp.page.locator('.app-thread-card', {
        hasText: buyerMessage,
      }).first();
      await sellerThreadCard.waitFor({
        state: 'visible',
        timeout: 30000,
      });
      logStep('open seller thread');
      await sellerThreadCard.click();
      await waitForHashRoute(sellerApp.page, '#thread/');
      await sellerApp.page.getByText(buyerMessage).waitFor({
        timeout: 30000,
      });

      const sellerReply = `Réponse vendeur ${Date.now()}`;
      logStep('send seller reply');
      await sellerApp.page.locator('input[name="threadMessage"]').fill(sellerReply);
      await sellerApp.page.getByRole('button', { name: 'Envoyer' }).click();
      await sellerApp.page.getByText(sellerReply).waitFor({
        timeout: 30000,
      });

      logStep('wait buyer live refresh');
      await buyerApp.page.getByText(sellerReply).waitFor({
        timeout: 30000,
      });

      return {
        buyerMessage,
        listingSlug: sellerListing.listingSlug,
        listingTitle: sellerListing.listingTitle,
        sellerReply,
      };
    } finally {
      await closeLiveApp(buyerApp);
    }
  } finally {
    await closeLiveApp(sellerApp);
  }
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) {
  runMessagingFlow()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack || error.message : error);
      process.exitCode = 1;
    });
}
