import {
  resolveSeededCapturePreviewImageUrl,
  resolveSeededCategoryPreviewImageUrl,
} from '../shared/listing-images.mjs';

const defaultPreviewUrl = resolveSeededCapturePreviewImageUrl('phone-front');

export function resolveDemoPreviewUrl(presetId = '', categoryId = '') {
  return (
    resolveSeededCapturePreviewImageUrl(presetId) ||
    resolveSeededCategoryPreviewImageUrl(categoryId) ||
    defaultPreviewUrl
  );
}
