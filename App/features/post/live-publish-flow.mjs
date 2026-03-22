import { updateListingDraft } from '../../models/listing-draft.mjs';
import { createLiveDraftService } from '../../services/live-draft-service.mjs';
import { createMediaService } from '../../services/media-service.mjs';

function inferContentType(url, fallback = 'image/jpeg') {
  const normalizedUrl = String(url || '').toLowerCase();

  if (normalizedUrl.endsWith('.svg')) {
    return 'image/svg+xml';
  }

  if (normalizedUrl.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedUrl.endsWith('.webp')) {
    return 'image/webp';
  }

  return fallback;
}

function buildDemoSvgBytes(photo) {
  const label = photo.promptId || photo.kind || 'photo';
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="900" viewBox="0 0 1200 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="900" rx="48" fill="#111214"/>
  <rect x="48" y="48" width="1104" height="804" rx="40" fill="#19241B" stroke="#6BE66B" stroke-width="4"/>
  <circle cx="930" cy="210" r="170" fill="rgba(107,230,107,0.16)"/>
  <circle cx="260" cy="680" r="140" fill="rgba(255,255,255,0.08)"/>
  <text x="120" y="220" font-family="Arial, sans-serif" font-size="46" font-weight="700" fill="#F7FBF8">Zwibba beta upload</text>
  <text x="120" y="310" font-family="Arial, sans-serif" font-size="94" font-weight="700" fill="#FFFFFF">${String(label).slice(0, 24)}</text>
  <text x="120" y="388" font-family="Arial, sans-serif" font-size="34" font-weight="400" fill="#DAE6DB">Image de démonstration générée côté navigateur</text>
</svg>`;

  return new TextEncoder().encode(svg);
}

function withFileExtension(fileName, extension) {
  if (!extension) {
    return fileName;
  }

  if (/\.[a-z0-9]+$/i.test(fileName)) {
    return fileName.replace(/\.[^.]+$/, `.${extension}`);
  }

  return `${fileName}.${extension}`;
}

function resolveSourcePresetId(photo) {
  return photo.sourcePresetId || photo.promptId || (photo.kind === 'primary' ? 'capture' : 'guided');
}

function resolveFileName(photo, sourcePresetId, extension = '') {
  const sourceUrl = photo.previewUrl || photo.url || '';
  const parsedUrl = new URL(sourceUrl, 'https://zwibba.local');
  const pathName = parsedUrl.pathname.split('/').filter(Boolean).pop();
  const baseName = pathName || `${sourcePresetId}-${photo.id || 'photo'}.jpg`;

  return withFileExtension(baseName, extension);
}

async function loadPhotoBytes({
  fetchFn,
  photo,
}) {
  const sourceUrl = photo.previewUrl || photo.url;

  if (!sourceUrl) {
    throw new Error('Photo source introuvable.');
  }

  if (sourceUrl.startsWith('/assets/demo/')) {
    return {
      bytes: buildDemoSvgBytes(photo),
      contentType: 'image/svg+xml',
      fileExtension: 'svg',
    };
  }

  const response = await fetchFn(sourceUrl);

  if (!response.ok) {
    return {
      bytes: buildDemoSvgBytes(photo),
      contentType: 'image/svg+xml',
      fileExtension: 'svg',
    };
  }

  const headerContentType = response.headers?.get?.('content-type') || '';
  const contentType = headerContentType || inferContentType(sourceUrl);
  const bytes = new Uint8Array(await response.arrayBuffer());

  return {
    bytes,
    contentType,
    fileExtension: contentType === 'image/svg+xml' ? 'svg' : '',
  };
}

async function ensureUploadedPhoto({
  fetchFn,
  mediaService,
  photo,
}) {
  if (photo.uploadStatus === 'uploaded' && photo.objectKey && photo.publicUrl) {
    return photo;
  }

  const sourcePresetId = resolveSourcePresetId(photo);
  const { bytes, contentType, fileExtension = '' } = await loadPhotoBytes({
    fetchFn,
    photo,
  });
  const fileName = resolveFileName(photo, sourcePresetId, fileExtension);
  const slot = await mediaService.requestUploadSlot({
    contentType,
    fileName,
    sourcePresetId,
  });

  await mediaService.uploadBytes({
    bytes,
    contentType,
    uploadUrl: slot.uploadUrl,
  });

  return {
    ...photo,
    objectKey: slot.objectKey,
    photoId: slot.photoId,
    publicUrl: slot.publicUrl,
    sourcePresetId: slot.sourcePresetId,
    uploadStatus: 'uploaded',
    url: slot.publicUrl,
  };
}

function resolveListingUrl({
  apiBaseUrl,
  outcome,
}) {
  if (outcome.shareUrl) {
    return outcome.shareUrl;
  }

  if (outcome.listingSlug) {
    return `${apiBaseUrl}/listings/${outcome.listingSlug}`;
  }

  return '';
}

export async function submitLivePublish({
  apiBaseUrl,
  draft,
  fetchFn = globalThis.fetch,
  session,
}) {
  const mediaService = createMediaService({
    apiBaseUrl,
    fetchFn,
  });
  const draftService = createLiveDraftService({
    apiBaseUrl,
    fetchFn,
  });
  const uploadedPhotos = [];

  for (const photo of draft.photos) {
    uploadedPhotos.push(await ensureUploadedPhoto({
      fetchFn,
      mediaService,
      photo,
    }));
  }

  const uploadReadyDraft = updateListingDraft(draft, {
    photos: uploadedPhotos,
  });
  const syncedDraft = await draftService.syncDraft({
    draft: uploadReadyDraft,
    session,
  });
  const outcome = await draftService.publishDraft({
    draft: syncedDraft,
    session,
  });

  return {
    draft: syncedDraft,
    listingUrl: resolveListingUrl({
      apiBaseUrl,
      outcome,
    }),
    outcome,
  };
}
