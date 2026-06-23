import assert from 'node:assert/strict';
import test from 'node:test';

import { createSellerRepliesService } from '../App/services/seller-replies-service.mjs';

test('seller replies service submits a seller reply with the active session', async () => {
  const requests = [];
  const service = createSellerRepliesService({
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
            sellerReply: 'Merci pour votre confiance.',
          };
        },
      };
    },
  });

  const review = await service.submitSellerReply({
    reply: 'Merci pour votre confiance.',
    reviewId: 'review_123',
    session: {
      sessionToken: 'zwibba_session_123',
    },
  });

  assert.deepEqual(review, {
    id: 'review_123',
    sellerReply: 'Merci pour votre confiance.',
  });
  assert.equal(requests[0].url, 'https://api.example.test/reviews/review_123/reply');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.headers.authorization, 'Bearer zwibba_session_123');
  assert.equal(requests[0].options.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    reply: 'Merci pour votre confiance.',
  });
});

test('seller replies service throws the parsed API error on non-ok responses', async () => {
  const service = createSellerRepliesService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async () => ({
      ok: false,
      status: 403,
      async json() {
        return {
          message: 'Seul le vendeur concerné peut répondre à cet avis.',
        };
      },
    }),
  });

  await assert.rejects(
    () => service.submitSellerReply({
      reply: 'Merci.',
      reviewId: 'review_123',
      session: {
        sessionToken: 'zwibba_session_123',
      },
    }),
    (error) => {
      assert.equal(error.message, 'Seul le vendeur concerné peut répondre à cet avis.');
      assert.equal(error.status, 403);
      return true;
    },
  );
});
