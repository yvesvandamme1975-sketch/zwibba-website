import assert from 'node:assert/strict';
import test from 'node:test';

import { Prisma } from '@prisma/client';

test('Listing has a nullable storyImageUrl string field', () => {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === 'Listing');
  assert.ok(model, 'Listing model exists');
  const field = model.fields.find((f) => f.name === 'storyImageUrl');
  assert.ok(field, 'storyImageUrl field exists');
  assert.equal(field.type, 'String');
  assert.equal(field.isRequired, false);
});
