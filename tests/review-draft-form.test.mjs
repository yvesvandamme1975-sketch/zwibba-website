import assert from 'node:assert/strict';
import test from 'node:test';

import { renderReviewFormScreen } from '../App/features/post/review-form-screen.mjs';
import { createReadyDraft } from '../App/features/post/post-flow-controller.mjs';
import { sellerCategories } from '../App/demo-content.mjs';
import { buildReviewDraftDetails } from '../App/utils/review-draft-form.mjs';

test('buildReviewDraftDetails builds fashion attributes from review form values', () => {
  const details = buildReviewDraftDetails({
    existingDetails: {
      area: 'Lubumbashi',
      attributesJson: {
        sellerNotes: {
          priority: 'high',
        },
      },
    },
    profileArea: 'Lubumbashi',
    values: {
      categoryId: 'fashion',
      condition: 'used_good',
      description: 'Chaussures très propres.',
      fashionItemType: 'shoes',
      fashionSize: '39',
      priceAmount: '25000',
      priceCurrency: 'CDF',
      title: 'Baskets Nike',
    },
  });

  assert.deepEqual(details, {
    title: 'Baskets Nike',
    categoryId: 'fashion',
    condition: 'used_good',
    attributesJson: {
      sellerNotes: {
        priority: 'high',
      },
      fashion: {
        itemType: 'shoes',
        size: '39',
      },
    },
    priceAmount: 25000,
    priceCurrency: 'CDF',
    description: 'Chaussures très propres.',
    area: 'Lubumbashi',
  });
});

test('buildReviewDraftDetails clears fashion attributes when category is no longer Mode', () => {
  const details = buildReviewDraftDetails({
    existingDetails: {
      area: 'Kolwezi',
      attributesJson: {
        fashion: {
          itemType: 'shoes',
          size: '39',
        },
        sellerNotes: {
          priority: 'medium',
        },
      },
    },
    profileArea: 'Kolwezi',
    values: {
      categoryId: 'music',
      condition: '',
      description: 'Clavier arrangé.',
      fashionItemType: 'shoes',
      fashionSize: '39',
      priceAmount: '350',
      priceCurrency: 'USD',
      title: 'Yamaha PSR',
    },
  });

  assert.deepEqual(details.attributesJson, {
    sellerNotes: {
      priority: 'medium',
    },
  });
  assert.equal(details.categoryId, 'music');
  assert.equal(details.priceAmount, 350);
  assert.equal(details.priceCurrency, 'USD');
});

test('buildReviewDraftDetails preserves zero price for free listings', () => {
  const details = buildReviewDraftDetails({
    existingDetails: {
      area: 'Lubumbashi',
      attributesJson: null,
    },
    profileArea: 'Lubumbashi',
    values: {
      categoryId: 'home_garden',
      condition: 'used_good',
      description: 'Chaise à donner.',
      priceAmount: '0',
      priceCurrency: 'CDF',
      title: 'Chaise gratuite',
    },
  });

  assert.equal(details.priceAmount, 0);
  assert.equal(details.priceCurrency, 'CDF');
});

test('buildReviewDraftDetails drops invalid fashion sizes for the selected item type', () => {
  const details = buildReviewDraftDetails({
    existingDetails: {
      area: 'Goma',
      attributesJson: null,
    },
    profileArea: 'Goma',
    values: {
      categoryId: 'fashion',
      condition: 'like_new',
      description: 'Pantalon homme.',
      fashionItemType: 'pants',
      fashionSize: '39',
      priceAmount: '45000',
      priceCurrency: 'CDF',
      title: 'Jean slim',
    },
  });

  assert.deepEqual(details.attributesJson, {
    fashion: {
      itemType: 'pants',
      size: '',
    },
  });
});

test('review form omits the Taille select for jewelry subtypes without a size grid', () => {
  const html = renderReviewFormScreen({
    categories: sellerCategories,
    conditionOptions: [{ value: 'used_good', label: 'Bon état' }],
    draft: createReadyDraft({
      area: 'Gombe',
      attributesJson: { fashion: { itemType: 'jewelry_earrings', size: '' } },
      categoryId: 'fashion',
      condition: 'used_good',
      description: "Boucles d'oreilles fantaisie.",
      priceAmount: 25000,
      priceCurrency: 'CDF',
      title: "Boucles d'oreilles à strass",
    }),
    profileArea: 'Gombe',
    validationErrors: [],
  });

  assert.match(html, /name="fashionItemType"/);
  assert.doesNotMatch(html, /name="fashionSize"/);
});

test('review form offers only EUR for a Belgian seller country and preselects it', () => {
  const html = renderReviewFormScreen({
    categories: sellerCategories,
    conditionOptions: [{ value: 'used_good', label: 'Bon état' }],
    draft: createReadyDraft({
      area: 'Bruxelles',
      priceAmount: null,
      priceCurrency: '',
    }),
    profileArea: 'Bruxelles',
    sellerCountryCode: 'BE',
    validationErrors: [],
  });

  const currencyOptionMatches = [...html.matchAll(/<option value="(CDF|USD|EUR)"[^>]*>/g)];

  assert.deepEqual(
    currencyOptionMatches.map((match) => match[1]),
    ['EUR'],
  );
  assert.match(html, /<option value="EUR" selected>€<\/option>/);
});

test('review form keeps CDF and USD currency options for a CD seller country', () => {
  const html = renderReviewFormScreen({
    categories: sellerCategories,
    conditionOptions: [{ value: 'used_good', label: 'Bon état' }],
    draft: createReadyDraft({
      area: 'Gombe',
      priceAmount: 450000,
      priceCurrency: 'CDF',
    }),
    profileArea: 'Gombe',
    sellerCountryCode: 'CD',
    validationErrors: [],
  });

  const currencyOptionMatches = [...html.matchAll(/<option value="(CDF|USD|EUR)"[^>]*>/g)];

  assert.deepEqual(
    currencyOptionMatches.map((match) => match[1]),
    ['CDF', 'USD'],
  );
  assert.match(html, /<option value="CDF" selected>CDF<\/option>/);
  assert.match(html, /<option value="USD">US\$<\/option>/);
});

test('review form keeps the Taille select for jewelry_ring', () => {
  const html = renderReviewFormScreen({
    categories: sellerCategories,
    conditionOptions: [{ value: 'used_good', label: 'Bon état' }],
    draft: createReadyDraft({
      area: 'Gombe',
      attributesJson: { fashion: { itemType: 'jewelry_ring', size: '54' } },
      categoryId: 'fashion',
      condition: 'used_good',
      description: 'Bague en or blanc.',
      priceAmount: 80000,
      priceCurrency: 'CDF',
      title: 'Bague or blanc losanges',
    }),
    profileArea: 'Gombe',
    validationErrors: [],
  });

  assert.match(html, /name="fashionSize"/);
  assert.match(html, /value="54"[^>]*selected/);
});
