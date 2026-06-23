import assert from 'node:assert/strict';
import test from 'node:test';

import { createReviewsService } from '../App/services/reviews-service.mjs';

test('reviews service submits a listing review with the active session', async () => {
  const requests = [];
  const service = createReviewsService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async (url, options) => {
      requests.push({
        options,
        url,
      });

      return {
        ok: true,
        async json() {
          return {
            id: 'review_123',
            rating: 5,
          };
        },
      };
    },
  });

  const review = await service.submitReview({
    comment: 'Vendeur fiable.',
    rating: 5,
    session: {
      sessionToken: 'zwibba_session_123',
    },
    slug: 'samsung-a54',
  });

  assert.deepEqual(review, {
    id: 'review_123',
    rating: 5,
  });
  assert.equal(requests[0].url, 'https://api.example.test/listings/samsung-a54/reviews');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.headers.authorization, 'Bearer zwibba_session_123');
  assert.equal(requests[0].options.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    comment: 'Vendeur fiable.',
    rating: 5,
  });
});

test('reviews service throws the parsed API error on non-ok responses', async () => {
  const service = createReviewsService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async () => ({
      ok: false,
      status: 400,
      async json() {
        return {
          message: 'Choisissez une note entre 1 et 5.',
        };
      },
    }),
  });

  await assert.rejects(
    () => service.submitReview({
      comment: '',
      rating: 7,
      session: {
        sessionToken: 'zwibba_session_123',
      },
      slug: 'samsung-a54',
    }),
    (error) => {
      assert.equal(error.message, 'Choisissez une note entre 1 et 5.');
      assert.equal(error.status, 400);
      return true;
    },
  );
});
