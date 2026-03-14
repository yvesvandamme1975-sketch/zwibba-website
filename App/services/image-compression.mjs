export function createImageCompressionService({
  maxBytes = 1_500_000,
} = {}) {
  return {
    compressImage(photo) {
      const originalSizeBytes = photo.sizeBytes ?? maxBytes;
      const sizeBytes = Math.min(originalSizeBytes, maxBytes);

      return {
        ...photo,
        originalSizeBytes,
        sizeBytes,
        wasCompressed: sizeBytes < originalSizeBytes,
      };
    },
  };
}
