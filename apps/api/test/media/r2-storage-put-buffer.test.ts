import assert from 'node:assert/strict';
import test from 'node:test';

import { R2StorageService } from '../../src/media/r2-storage.service';

test('R2StorageService exposes a putBuffer method', () => {
  const service = new R2StorageService();
  assert.equal(typeof (service as any).putBuffer, 'function');
});

test('putBuffer returns the public URL composed from publicBaseUrl + objectKey', async () => {
  const service = new R2StorageService();
  // Mock S3Client.send to resolve without hitting the real bucket
  (service as any).s3Client = { send: async () => ({}) };
  const result = await (service as any).putBuffer({
    objectKey: 'listings/test-id/story.png',
    contentType: 'image/png',
    body: Buffer.from('fake-png-data'),
  });
  assert.match(result.publicUrl, /listings\/test-id\/story\.png$/);
  assert.equal(result.objectKey, 'listings/test-id/story.png');
});
