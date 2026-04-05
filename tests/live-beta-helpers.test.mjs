import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyUploadOutcome,
  extractAppRoute,
} from '../scripts/e2e/live-beta-helpers.mjs';

test('extractAppRoute resolves the live hash router shape', () => {
  assert.deepEqual(
    extractAppRoute('https://website-production-7a12.up.railway.app/App/#listing/test-annonce'),
    {
      type: 'listing',
      value: 'test-annonce',
    },
  );

  assert.deepEqual(
    extractAppRoute('https://website-production-7a12.up.railway.app/App/#thread/thread_123'),
    {
      type: 'thread',
      value: 'thread_123',
    },
  );

  assert.deepEqual(
    extractAppRoute('https://website-production-7a12.up.railway.app/App/#review'),
    {
      type: 'review',
      value: '',
    },
  );
});

test('classifyUploadOutcome ignores known R2 abort noise when the object and UI are healthy', () => {
  const result = classifyUploadOutcome({
    failedRequests: [
      {
        errorText: 'net::ERR_ABORTED',
        method: 'PUT',
        url: 'https://pub-uploads.example.r2.cloudflarestorage.com/signed-put',
      },
      {
        errorText: 'net::ERR_ABORTED',
        method: 'HEAD',
        url: 'https://cdn.zwibba.example/draft-photos/example.jpg',
      },
    ],
    imageRendered: true,
    objectReachable: true,
    uploadSlotIssued: true,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.blockingFailures, []);
});

test('classifyUploadOutcome fails when the upload postconditions are incomplete', () => {
  const result = classifyUploadOutcome({
    failedRequests: [],
    imageRendered: false,
    objectReachable: false,
    uploadSlotIssued: true,
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /reachable/i);
});
