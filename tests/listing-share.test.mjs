import assert from 'node:assert/strict';
import test from 'node:test';
import { createListingShareController } from '../App/services/listing-share.mjs';

function setup(overrides = {}) {
  const calls = [];
  const controller = createListingShareController({
    baseUrl: 'https://zwibba.com',
    navigatorObject: { share: data => { calls.push(['native', data]); return Promise.resolve(); }, canShare: () => true, clipboard: { writeText: async text => calls.push(['copy', text]) } },
    fetchFn: async () => new Response(new Blob(['png'], { type: 'image/png' })),
    openWindow: url => { calls.push(['open', url]); return true; },
    downloadFile: file => calls.push(['download', file]),
    ...overrides,
  });
  controller.open({ slug: 'velo', title: 'Vélo de Liège', url: '/annonce/velo/' });
  return { controller, calls };
}

test('native link share is invoked synchronously with the selected listing context', async () => {
  const { controller, calls } = setup();
  const promise = controller.perform('native-link');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ['native', { title: 'Vélo de Liège', text: 'Vélo de Liège — Zwibba', url: 'https://zwibba.com/annonce/velo/' }]);
  assert.equal(await promise, 'handed-off');
  assert.doesNotMatch(controller.state.message, /publié|succès/i);
});

test('cancellation never opens a network, downloads or records success', async () => {
  const { controller, calls } = setup({ navigatorObject: { share: () => Promise.reject(new DOMException('cancel', 'AbortError')) } });
  assert.equal(await controller.perform('native-link'), 'cancelled');
  assert.equal(controller.state.message, '');
  assert.deepEqual(calls, []);
});

test('WhatsApp uses the selected title, not a seller or unrelated draft claim', async () => {
  const { controller, calls } = setup();
  const promise = controller.perform('whatsapp');
  assert.match(new URL(calls[0][1]).searchParams.get('text'), /^Vélo de Liège — Zwibba\nhttps:\/\/zwibba.com\/annonce\/velo\/$/);
  assert.equal(await promise, 'opened');
  assert.doesNotMatch(controller.state.message, /publié|partagé avec succès/i);
});

test('blocked popup produces an actionable error', async () => {
  const { controller } = setup({ openWindow: () => false });
  assert.equal(await controller.perform('facebook'), 'error');
  assert.match(controller.state.message, /bloquée|bloqué/i);
});

test('clipboard rejection offers the exact text without claiming a copy', async () => {
  const { controller } = setup({ navigatorObject: { clipboard: { writeText: () => Promise.reject(new Error('denied')) } } });
  assert.equal(await controller.perform('copy-link'), 'manual');
  assert.equal(controller.state.manualText, 'https://zwibba.com/annonce/velo/');
  assert.doesNotMatch(controller.state.message, /Lien copié/);
});

test('successful copy is distinguished from a publication', async () => {
  const { controller, calls } = setup();
  assert.equal(await controller.perform('copy-caption'), 'copied');
  assert.equal(calls[0][0], 'copy');
  assert.match(controller.state.message, /Légende copiée/);
});

test('double click cannot launch a second native sheet', async () => {
  let finish;
  let count = 0;
  const { controller } = setup({ navigatorObject: { share: () => { count++; return new Promise(resolve => { finish = resolve; }); } } });
  const first = controller.perform('native-link');
  assert.equal(await controller.perform('native-link'), 'busy');
  finish();
  await first;
  assert.equal(count, 1);
});

test('files are prepared before click and native image share performs no fetch', async () => {
  let fetches = 0;
  const { controller, calls } = setup({ fetchFn: async () => { fetches++; return new Response(new Blob(['png'], { type: 'image/png' })); } });
  await controller.open({ slug: 'velo', title: 'Vélo', storyImageUrl: 'https://cdn.example/story.png' });
  assert.equal(controller.state.imageStatus, 'ready');
  const promise = controller.perform('native-image');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].files[0].type, 'image/png');
  assert.equal(calls[0][1].url, undefined);
  await promise;
  assert.equal(fetches, 1);
});

for (const [label, response] of [
  ['HTTP error', () => new Response('failed', { status: 503 })],
  ['HTML', () => new Response('<html>', { headers: { 'content-type': 'text/html' } })],
  ['empty image', () => new Response(new Blob([], { type: 'image/png' }))],
  ['oversized image', () => new Response('x', { headers: { 'content-type': 'image/png', 'content-length': '20000000' } })],
]) {
  test(`preparation rejects ${label} and keeps link sharing available`, async () => {
    const { controller } = setup({ fetchFn: async () => response() });
    await controller.open({ slug: 'velo', storyImageUrl: 'https://cdn.example/story.png' });
    assert.equal(controller.state.imageStatus, 'unavailable');
    assert.equal(await controller.perform('native-image'), 'error');
    assert.equal(await controller.perform('copy-link'), 'copied');
  });
}

test('stale file fetch does not replace the newly selected listing', async () => {
  let finish;
  const { controller } = setup({ fetchFn: () => new Promise(resolve => { finish = resolve; }) });
  const stale = controller.open({ slug: 'old', storyImageUrl: 'https://cdn.example/old.png' });
  await controller.open({ slug: 'new', title: 'Nouvelle annonce' });
  finish(new Response(new Blob(['png'], { type: 'image/png' })));
  await stale;
  assert.equal(controller.state.slug, 'new');
  assert.equal(controller.state.imageStatus, 'unavailable');
});

test('Instagram and TikTok explain export without opening or copying silently', async () => {
  for (const action of ['instagram', 'tiktok']) {
    const { controller, calls } = setup();
    assert.equal(await controller.perform(action), 'instructions');
    assert.match(controller.state.message, /image.*légende/i);
    assert.deepEqual(calls, []);
  }
});

test('only public same-origin listing URLs can be shared', async () => {
  const { controller } = setup();
  await controller.open({ slug: 'velo', url: 'javascript:alert(1)' });
  assert.equal(controller.state.url, 'https://zwibba.com/annonce/velo/');
  controller.close();
  assert.equal(controller.state, null);
});
