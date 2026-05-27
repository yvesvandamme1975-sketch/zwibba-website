import assert from 'node:assert/strict';
import test from 'node:test';

import { renderCaptureScreen } from '../App/features/post/capture-screen.mjs';
import { renderPhotoGuidanceScreen } from '../App/features/post/photo-guidance-screen.mjs';
import { renderCaptureResultScreen } from '../App/features/post/capture-result-screen.mjs';

function buildEmptyDraft() {
  return {
    id: 'd1',
    ai: { status: 'ready', message: '' },
    details: { area: '', categoryId: 'phones_tablets', condition: '', description: '', title: '' },
    photos: [],
  };
}

test('renderCaptureScreen does not declare a capture attribute on file inputs', () => {
  const html = renderCaptureScreen({ draft: buildEmptyDraft() });
  assert.doesNotMatch(html, /capture=/);
  assert.match(html, /type="file"[^>]*accept="image\/\*"/);
});

test('renderPhotoGuidanceScreen does not declare a capture attribute on file inputs', () => {
  const html = renderPhotoGuidanceScreen({
    draft: buildEmptyDraft(),
    activePromptId: '',
    missingPromptIds: [],
  });
  assert.doesNotMatch(html, /capture=/);
});

test('renderCaptureResultScreen does not declare a capture attribute on file inputs', () => {
  const html = renderCaptureResultScreen({
    draft: { ...buildEmptyDraft(), photos: [{ photoId: 'p1', uploadStatus: 'ok' }] },
  });
  assert.doesNotMatch(html, /capture=/);
});
