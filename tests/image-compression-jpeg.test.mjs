import { test } from 'node:test';
import assert from 'node:assert/strict';


import { createImageCompressionService } from '../App/services/image-compression.mjs';
test('une photo heic decodable est exportee en jpeg', async () => {
  const calls = [];
  const outputBytes = new Uint8Array([1, 2, 3]);
  const file = {
    name: 'photo.heic',
    type: 'image/heic',
    size: 2_000_000,
    async arrayBuffer() {
      return new Uint8Array([9, 8, 7]).buffer;
    },
  };
  const service = createImageCompressionService({
    createImageBitmapFn: async () => ({ width: 1200, height: 900, close() {} }),
    documentRef: {
      createElement(tagName) {
        assert.equal(tagName, 'canvas');
        return {
          width: 0,
          height: 0,
          getContext(kind) {
            assert.equal(kind, '2d');
            return { drawImage() {} };
          },
          toBlob(callback, contentType, quality) {
            calls.push({ contentType, quality });
            callback({
              size: 900_000,
              async arrayBuffer() {
                return outputBytes.buffer;
              },
            });
          },
        };
      },
    },
    maxBytes: 1_500_000,
  });

  const result = await service.compressImage(file, {
    contentType: 'image/heic',
    fileName: 'photo.heic',
    sizeBytes: file.size,
  });

  assert.equal(calls[0].contentType, 'image/jpeg');
  assert.equal(result.photo.contentType, 'image/jpeg');
  assert.equal(result.photo.fileName, 'photo.jpg');
  assert.equal(result.upload.contentType, 'image/jpeg');
  assert.equal(result.upload.fileName, 'photo.jpg');
});
