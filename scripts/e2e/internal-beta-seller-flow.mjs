import assert from 'node:assert/strict';

import {
  DEFAULT_SELLER_PHONE,
  DEFAULT_TEST_IMAGE_PATH,
  authenticateViaProfile,
  classifyUploadOutcome,
  closeLiveApp,
  extractAppRoute,
  fillFirstPhoto,
  fillReviewDraft,
  openLiveApp,
  reachabilityCheck,
  waitForHashRoute,
  waitForImageReady,
} from './live-beta-helpers.mjs';

export async function runSellerFlow({
  description = '',
  deviceName = process.env.ZWIBBA_E2E_DEVICE || 'desktop',
  filePath = DEFAULT_TEST_IMAGE_PATH,
  phoneNumber = DEFAULT_SELLER_PHONE,
  stopAt = 'success',
  titlePrefix = 'Zwibba beta seller',
} = {}) {
  const logStep = (label) => {
    console.error(`[seller-e2e:${deviceName}] ${label}`);
  };
  const app = await openLiveApp({
    deviceName,
    hash: '#profile',
  });

  try {
    logStep('authenticate profile');
    await authenticateViaProfile(app.page, {
      phoneNumber,
    });

    logStep('open sell');
    await app.page.goto(`${app.page.url().split('#')[0]}#sell`, {
      waitUntil: 'domcontentloaded',
    });

    logStep('start capture');
    const takePhotoLink = app.page.getByRole('link', { name: 'Prendre une photo' });
    if (await takePhotoLink.count()) {
      await takePhotoLink.click();
    } else {
      await app.page.goto(`${app.page.url().split('#')[0]}#capture`, {
        waitUntil: 'domcontentloaded',
      });
    }

    logStep('upload first photo');
    await fillFirstPhoto(app.page, filePath);
    logStep('wait capture result route');
    await waitForHashRoute(app.page, '#capture-result');
    logStep('wait capture result image');
    await waitForImageReady(app.page, '.app-capture-result__hero-image');

    const uploadSlotIssued = app.requestLog.some((request) => {
      return request.url.includes('/media/upload-url');
    });
    const uploadedImageUrl = await app.page
      .locator('.app-capture-result__hero-image')
      .getAttribute('src');
    const objectReachable = uploadedImageUrl ? await reachabilityCheck(uploadedImageUrl) : false;
    const imageRendered = Boolean(
      uploadedImageUrl &&
        (await app.page.locator('.app-capture-result__hero-image').count()),
    );
    const uploadOutcome = classifyUploadOutcome({
      failedRequests: app.failedRequests,
      imageRendered,
      objectReachable,
      uploadSlotIssued,
    });

    assert.equal(uploadOutcome.ok, true, uploadOutcome.reason);

    if (stopAt === 'capture-result') {
      return {
        deviceName,
        objectReachable,
        route: extractAppRoute(app.page.url()),
        uploadedImageUrl,
        uploadOutcome,
      };
    }

    logStep('continue to review');
    await app.page.getByRole('link', { name: /Continuer vers/u }).click();
    await waitForHashRoute(app.page, '#review');

    logStep('fill review');
    const listingTitle = `${titlePrefix} ${Date.now()}`;
    const listingDescription =
      description || `${listingTitle} - annonce testée automatiquement sur la beta live.`;

    await fillReviewDraft(app.page, {
      description: listingDescription,
      priceCdf: '450000',
      title: listingTitle,
    });

    logStep('go publish gate');
    await app.page.getByRole('button', { name: "Publier l'annonce" }).click();
    await waitForHashRoute(app.page, '#publish');
    logStep('submit publish');
    await app.page.getByRole('button', { name: 'Publier maintenant' }).click();
    await waitForHashRoute(app.page, '#success', 60000);
    logStep('inspect success state');
    await waitForImageReady(app.page, '.app-success__hero-image').catch(() => null);

    const successTitle =
      (await app.page.locator('.app-flow--success .app-flow__title').textContent().catch(() => '')) ||
      '';
    const viewListingLink = app.page.locator('a[href^="#listing/"]').first();
    let listingSlug = '';

    if (await viewListingLink.count()) {
      const listingHref = await viewListingLink.getAttribute('href');

      if (listingHref) {
        logStep('open created listing');
        await viewListingLink.click();
        await waitForHashRoute(app.page, '#listing/');
        await waitForImageReady(app.page, '.app-detail__media img');
        listingSlug = extractAppRoute(app.page.url()).value;
      }
    }

    return {
      deviceName,
      listingSlug,
      listingTitle,
      objectReachable,
      outcomeTitle: successTitle?.trim() || '',
      phoneNumber,
      uploadedImageUrl,
      uploadOutcome,
    };
  } finally {
    await closeLiveApp(app);
  }
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`;

if (isDirectRun) {
  runSellerFlow()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack || error.message : error);
      process.exitCode = 1;
    });
}
