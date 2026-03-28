function resolveOriginalSize(photo = {}, file = null, fallbackBytes = null) {
  return (
    photo.sizeBytes ??
    file?.size ??
    fallbackBytes?.byteLength ??
    0
  );
}

function replaceFileExtension(fileName, nextExtension) {
  const normalizedName = String(fileName || 'photo').trim() || 'photo';
  const baseName = normalizedName.replace(/\.[^.]+$/u, '') || 'photo';

  return `${baseName}.${nextExtension}`;
}

function readBytesFromBufferLike(value) {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (Array.isArray(value)) {
    return Uint8Array.from(value);
  }

  return null;
}

async function readFileBytes(file) {
  if (typeof file?.arrayBuffer === 'function') {
    return new Uint8Array(await file.arrayBuffer());
  }

  const fallbackBytes = readBytesFromBufferLike(file?.bytes);

  if (fallbackBytes) {
    return fallbackBytes;
  }

  throw new Error('Photo introuvable.');
}

function shouldTranscodeToJpeg(contentType = '') {
  return /^image\/hei(c|f)$/iu.test(contentType);
}

function canCompressRasterImage(contentType = '') {
  return /^image\/(jpe?g|png|webp|hei(c|f))$/iu.test(contentType);
}

async function canvasToBlob(canvas, contentType, quality) {
  if (typeof canvas?.toBlob !== 'function') {
    return null;
  }

  return new Promise((resolve) => {
    canvas.toBlob(resolve, contentType, quality);
  });
}

async function loadImageSource({
  createImageBitmapFn,
  file,
  imageCtor,
  urlApi,
}) {
  if (typeof createImageBitmapFn === 'function') {
    const bitmap = await createImageBitmapFn(file);

    return {
      height: bitmap.height,
      image: bitmap,
      release() {
        bitmap.close?.();
      },
      width: bitmap.width,
    };
  }

  if (typeof imageCtor !== 'function' || typeof urlApi?.createObjectURL !== 'function') {
    throw new Error('Compression navigateur indisponible.');
  }

  const image = new imageCtor();
  const objectUrl = urlApi.createObjectURL(file);

  try {
    await new Promise((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Impossible de charger la photo.'));
      image.src = objectUrl;
    });

    return {
      height: image.naturalHeight || image.height,
      image,
      release() {
        urlApi.revokeObjectURL(objectUrl);
      },
      width: image.naturalWidth || image.width,
    };
  } catch (error) {
    urlApi.revokeObjectURL(objectUrl);
    throw error;
  }
}

function scaleDimensions(width, height, maxDimension) {
  if (!width || !height) {
    return {
      height: maxDimension,
      width: maxDimension,
    };
  }

  const ratio = Math.min(1, maxDimension / Math.max(width, height));

  return {
    height: Math.max(1, Math.round(height * ratio)),
    width: Math.max(1, Math.round(width * ratio)),
  };
}

function createCanvas(documentRef, width, height) {
  const canvas = documentRef?.createElement?.('canvas');

  if (!canvas) {
    throw new Error('Canvas navigateur indisponible.');
  }

  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function createCompressedUpload({
  contentType,
  createImageBitmapFn,
  documentRef,
  file,
  imageCtor,
  maxBytes,
  maxDimension,
  photo,
  urlApi,
}) {
  const originalBytes = await readFileBytes(file);
  const originalSizeBytes = resolveOriginalSize(photo, file, originalBytes);
  const source = await loadImageSource({
    createImageBitmapFn,
    file,
    imageCtor,
    urlApi,
  });

  try {
    const baseDimensions = scaleDimensions(source.width, source.height, maxDimension);
    const passes = [
      { quality: 0.86, scale: 1 },
      { quality: 0.74, scale: 0.92 },
      { quality: 0.62, scale: 0.84 },
      { quality: 0.52, scale: 0.72 },
    ];
    let bestBlob = null;

    for (const pass of passes) {
      const width = Math.max(1, Math.round(baseDimensions.width * pass.scale));
      const height = Math.max(1, Math.round(baseDimensions.height * pass.scale));
      const canvas = createCanvas(documentRef, width, height);
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Contexte canvas indisponible.');
      }

      context.drawImage(source.image, 0, 0, width, height);
      const blob = await canvasToBlob(canvas, 'image/jpeg', pass.quality);

      if (!blob) {
        throw new Error('Compression JPEG indisponible.');
      }

      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }

      if (blob.size <= maxBytes) {
        bestBlob = blob;
        break;
      }
    }

    if (!bestBlob) {
      throw new Error('Impossible de compresser la photo.');
    }

    const bytes = new Uint8Array(await bestBlob.arrayBuffer());
    const nextContentType = 'image/jpeg';
    const nextFileName = replaceFileExtension(
      photo.fileName || file?.name || 'photo.jpg',
      'jpg',
    );

    return {
      photo: {
        ...photo,
        contentType: nextContentType,
        fileName: nextFileName,
        originalSizeBytes,
        sizeBytes: bestBlob.size,
        wasCompressed: bestBlob.size < originalSizeBytes || contentType !== nextContentType,
      },
      upload: {
        bytes,
        contentType: nextContentType,
        fileName: nextFileName,
      },
    };
  } finally {
    source.release?.();
  }
}

function createPassthroughUpload(file, photo) {
  return readFileBytes(file).then((bytes) => {
    const contentType = photo.contentType || file?.type || 'image/jpeg';
    const originalSizeBytes = resolveOriginalSize(photo, file, bytes);

    return {
      photo: {
        ...photo,
        contentType,
        fileName: photo.fileName || file?.name || 'photo.jpg',
        originalSizeBytes,
        sizeBytes: originalSizeBytes,
        wasCompressed: false,
      },
      upload: {
        bytes,
        contentType,
        fileName: photo.fileName || file?.name || 'photo.jpg',
      },
    };
  });
}

export function createImageCompressionService({
  createImageBitmapFn = globalThis.createImageBitmap,
  documentRef = globalThis.document,
  imageCtor = globalThis.Image,
  maxBytes = 1_500_000,
  maxDimension = 1600,
  urlApi = globalThis.URL,
} = {}) {
  return {
    compressImage(fileOrPhoto, maybePhoto) {
      if (!maybePhoto) {
        const photo = fileOrPhoto ?? {};
        const originalSizeBytes = photo.sizeBytes ?? maxBytes;
        const sizeBytes = Math.min(originalSizeBytes, maxBytes);

        return {
          ...photo,
          originalSizeBytes,
          sizeBytes,
          wasCompressed: sizeBytes < originalSizeBytes,
        };
      }

      const file = fileOrPhoto;
      const photo = maybePhoto;
      const contentType = photo.contentType || file?.type || 'image/jpeg';
      const originalSizeBytes = resolveOriginalSize(photo, file);
      const needsCompression =
        canCompressRasterImage(contentType) &&
        (originalSizeBytes > maxBytes || shouldTranscodeToJpeg(contentType));

      if (!needsCompression) {
        return createPassthroughUpload(file, photo);
      }

      return createCompressedUpload({
        contentType,
        createImageBitmapFn,
        documentRef,
        file,
        imageCtor,
        maxBytes,
        maxDimension,
        photo,
        urlApi,
      }).catch(() => createPassthroughUpload(file, photo));
    },
  };
}
