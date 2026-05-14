import assert from 'node:assert/strict';
import test from 'node:test';

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
