import sharp from 'sharp';

export async function createListingThumbnail(source: string, allowedBaseUrl: string, fetchImpl: typeof fetch = fetch) {
  const url = new URL(source);
  const base = new URL(allowedBaseUrl);
  if (url.protocol !== 'https:' || url.origin !== base.origin || url.username || url.password) throw Error('thumbnail_source_not_allowed');
  const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
  if (!response.ok || !response.body) throw Error('thumbnail_download_failed');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 8_000_000) throw Error('thumbnail_too_large');
    chunks.push(chunk);
  }
  return sharp(Buffer.concat(chunks), { limitInputPixels: 40_000_000 }).rotate()
    .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75 }).toBuffer();
}
