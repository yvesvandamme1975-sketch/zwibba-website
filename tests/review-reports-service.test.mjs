import assert from 'node:assert/strict';
import test from 'node:test';

import { createReviewReportsService } from '../App/services/review-reports-service.mjs';

test('review reports service reports a review with the active session', async () => {
  const requests = [];
  const service = createReviewReportsService({
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
            id: 'report_123',
            reason: 'fake',
            status: 'pending',
          };
        },
      };
    },
  });

  const report = await service.reportReview({
    reason: 'fake',
    reviewId: 'review 123',
    session: {
      sessionToken: 'zwibba_session_123',
    },
  });

  assert.deepEqual(report, {
    id: 'report_123',
    reason: 'fake',
    status: 'pending',
  });
  assert.equal(requests[0].url, 'https://api.example.test/reviews/review%20123/report');
  assert.equal(requests[0].options.method, 'POST');
  assert.equal(requests[0].options.headers.authorization, 'Bearer zwibba_session_123');
  assert.equal(requests[0].options.headers['content-type'], 'application/json');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    reason: 'fake',
  });
});

test('review reports service throws the parsed API error on non-ok responses', async () => {
  const service = createReviewReportsService({
    apiBaseUrl: 'https://api.example.test',
    fetchFn: async () => ({
      ok: false,
      status: 400,
      async json() {
        return {
          message: 'Motif de signalement invalide.',
        };
      },
    }),
  });

  await assert.rejects(
    () => service.reportReview({
      reason: 'bad',
      reviewId: 'review_123',
      session: {
        sessionToken: 'zwibba_session_123',
      },
    }),
    (error) => {
      assert.equal(error.message, 'Motif de signalement invalide.');
      assert.equal(error.status, 400);
      return true;
    },
  );
});
