import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { ZWIBBA_LOGO_SVG } from './zwibba-logo.svg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

(() => {
  process.env.FONTCONFIG_FILE ??= path.resolve(__dirname, '../../assets/fonts/fonts.conf');
})();

export interface ComposeStoryImageInput {
  photoBuffer: Buffer;
  title: string;
  zoneLabel: string;
  priceLabel: string;
}

const CANVAS_WIDTH = 1080;
const PHOTO_TOP = 96;
const PHOTO_SIZE = 972;
const PHOTO_RADIUS = 48;
const FOOTER_TOP = 1640;
const LOGO_WIDTH = 560;
const LABEL_HEIGHT = 104;
const LABEL_TO_LOGO_GAP = 26;

export async function composeStoryImage(input: ComposeStoryImageInput): Promise<Buffer> {
  const canvas = sharp({
    create: { width: CANVAS_WIDTH, height: 1920, channels: 4, background: '#0f160f' },
  }).png();

  // Clip the photo to rounded corners (mask kept where the rounded rect is opaque).
  const photoMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PHOTO_SIZE}" height="${PHOTO_SIZE}"><rect width="${PHOTO_SIZE}" height="${PHOTO_SIZE}" rx="${PHOTO_RADIUS}" ry="${PHOTO_RADIUS}" fill="#ffffff"/></svg>`,
  );
  const photo = await sharp(input.photoBuffer)
    .resize(PHOTO_SIZE, PHOTO_SIZE, { fit: 'cover' })
    .composite([{ input: photoMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Render the brand logo to its real content bounds (trim the SVG's internal
  // padding) so the lockup can be positioned to the pixel.
  const logo = await sharp(Buffer.from(ZWIBBA_LOGO_SVG), { density: 320 })
    .trim()
    .resize({ width: LOGO_WIDTH })
    .png()
    .toBuffer();
  const logoHeight = (await sharp(logo).metadata()).height ?? 320;

  // Centre the "Je vends sur" + logo lockup in the gap between photo and footer.
  const labelSvg = buildLabelSvg();
  const footerSvg = buildFooterSvg(input);
  const blockHeight = LABEL_HEIGHT + LABEL_TO_LOGO_GAP + logoHeight;
  const gapTop = PHOTO_TOP + PHOTO_SIZE;
  const blockTop = Math.round(gapTop + (FOOTER_TOP - gapTop - blockHeight) / 2);
  const logoLeft = Math.round((CANVAS_WIDTH - LOGO_WIDTH) / 2);

  return canvas
    .composite([
      { input: photo, top: PHOTO_TOP, left: 54 },
      { input: Buffer.from(labelSvg), top: blockTop, left: 0 },
      { input: logo, top: blockTop + LABEL_HEIGHT + LABEL_TO_LOGO_GAP, left: logoLeft },
      { input: Buffer.from(footerSvg), top: FOOTER_TOP, left: 0 },
    ])
    .png()
    .toBuffer();
}

/** Landscape link preview (Open Graph) for WhatsApp, Facebook and the
 * Instagram link sticker. Those applications crop towards the centre, often to
 * a square, so the photo and the "Je vends sur Zwibba" lockup both live inside
 * the central 630x630 band; the side panels only carry secondary text. The
 * photo is fitted, never stretched or cropped. Output is a JPEG under 300 KB
 * because WhatsApp refuses larger preview images. */
export const LINK_WIDTH = 1200;
export const LINK_HEIGHT = 630;
const LINK_SAFE_LEFT = (LINK_WIDTH - LINK_HEIGHT) / 2; // 285
const LINK_PHOTO_BOX = { left: LINK_SAFE_LEFT + 35, top: 36, width: 560, height: 372 };
const LINK_LOCKUP = { left: LINK_SAFE_LEFT + 15, top: 430, width: 600, height: 170 };
const LINK_LOCKUP_LOGO_WIDTH = 300;
const LINK_JPEG_QUALITY = 82;
const LINK_MAX_BYTES = 300_000;

export interface LinkImageBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Pure geometry so the safe-crop guarantees can be tested without rendering. */
export function linkImageLayout(photo: { width: number; height: number }): { photoBox: LinkImageBox; photo: LinkImageBox; lockup: LinkImageBox } {
  const width = Math.max(1, photo.width);
  const height = Math.max(1, photo.height);
  const scale = Math.min(LINK_PHOTO_BOX.width / width, LINK_PHOTO_BOX.height / height);
  const fitted = { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
  if (fitted.width > LINK_PHOTO_BOX.width) fitted.width = LINK_PHOTO_BOX.width;
  if (fitted.height > LINK_PHOTO_BOX.height) fitted.height = LINK_PHOTO_BOX.height;
  return {
    photoBox: { ...LINK_PHOTO_BOX },
    photo: {
      left: LINK_PHOTO_BOX.left + Math.round((LINK_PHOTO_BOX.width - fitted.width) / 2),
      top: LINK_PHOTO_BOX.top + Math.round((LINK_PHOTO_BOX.height - fitted.height) / 2),
      width: fitted.width,
      height: fitted.height,
    },
    lockup: { ...LINK_LOCKUP },
  };
}

export function buildLinkLockupSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LINK_LOCKUP.width}" height="${LINK_LOCKUP.height}" viewBox="0 0 ${LINK_LOCKUP.width} ${LINK_LOCKUP.height}">
    <title>Je vends sur Zwibba</title>
    <text x="${LINK_LOCKUP.width / 2}" y="46" fill="#9aff8f" font-family="Manrope" font-size="42" font-weight="700" letter-spacing="0.5" text-anchor="middle">Je vends sur</text>
  </svg>`;
}

function buildLinkSidePanelSvg(input: ComposeStoryImageInput): string {
  const words = truncate(input.title, 60).split(' ');
  const lines: string[] = [''];
  for (const word of words) {
    const last = lines.length - 1;
    if (`${lines[last]} ${word}`.trim().length > 16 && lines[last]) lines.push(word);
    else lines[last] = `${lines[last]} ${word}`.trim();
  }
  const titleLines = lines.slice(0, 3).map((line, index) =>
    `<text x="36" y="${140 + index * 40}" font-family="Manrope" font-size="28" font-weight="700" fill="#ffffff">${escapeXml(truncate(line, 17))}${index === 2 && lines.length > 3 ? '…' : ''}</text>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LINK_SAFE_LEFT}" height="${LINK_HEIGHT}" viewBox="0 0 ${LINK_SAFE_LEFT} ${LINK_HEIGHT}">
    ${titleLines}
    <text x="36" y="320" font-family="Manrope" font-size="22" fill="#c2cec2">${escapeXml(truncate(input.zoneLabel, 22))}</text>
    <text x="36" y="392" font-family="Sora" font-size="40" font-weight="700" fill="#9aff8f">${escapeXml(truncate(input.priceLabel, 14))}</text>
    <text x="36" y="580" font-family="Manrope" font-size="20" fill="#c2cec2">zwibba.com</text>
  </svg>`;
}

export async function composeLinkImage(input: ComposeStoryImageInput): Promise<Buffer> {
  const meta = await sharp(input.photoBuffer).metadata();
  // EXIF orientations 5-8 swap the visible axes once `.rotate()` applies them.
  const swapped = (meta.orientation ?? 1) >= 5;
  const layout = linkImageLayout({
    width: (swapped ? meta.height : meta.width) ?? 1,
    height: (swapped ? meta.width : meta.height) ?? 1,
  });

  // Full-bleed blurred, darkened copy of the photo: fills the canvas without
  // deforming the visible photo and keeps the side panels on-brand.
  const backdrop = await sharp(input.photoBuffer).rotate()
    .resize(LINK_WIDTH, LINK_HEIGHT, { fit: 'cover' })
    .blur(28)
    .modulate({ brightness: 0.42, saturation: 0.8 })
    .png().toBuffer();
  // `inside` preserves the aspect ratio; the exact rendered size is read back
  // so the placement never depends on rounding assumptions.
  const photo = await sharp(input.photoBuffer).rotate()
    .resize(layout.photoBox.width, layout.photoBox.height, { fit: 'inside', withoutEnlargement: false })
    .png().toBuffer();
  const photoMeta = await sharp(photo).metadata();
  const photoWidth = photoMeta.width ?? layout.photo.width;
  const photoHeight = photoMeta.height ?? layout.photo.height;
  const photoLeft = layout.photoBox.left + Math.round((layout.photoBox.width - photoWidth) / 2);
  const photoTop = layout.photoBox.top + Math.round((layout.photoBox.height - photoHeight) / 2);
  const photoMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${photoWidth}" height="${photoHeight}"><rect width="${photoWidth}" height="${photoHeight}" rx="22" ry="22" fill="#ffffff"/></svg>`,
  );
  const roundedPhoto = await sharp(photo).composite([{ input: photoMask, blend: 'dest-in' }]).png().toBuffer();
  const logo = await sharp(Buffer.from(ZWIBBA_LOGO_SVG), { density: 240 })
    .trim()
    .resize({ width: LINK_LOCKUP_LOGO_WIDTH })
    .png().toBuffer();
  const logoHeight = (await sharp(logo).metadata()).height ?? 90;
  const logoTop = layout.lockup.top + 62;
  const logoLeft = Math.round((LINK_WIDTH - LINK_LOCKUP_LOGO_WIDTH) / 2);
  if (logoTop + logoHeight > layout.lockup.top + layout.lockup.height) {
    throw new Error('link_lockup_overflow');
  }

  const render = (quality: number) => sharp(backdrop)
    .composite([
      { input: Buffer.from(buildLinkSidePanelSvg(input)), left: 0, top: 0 },
      { input: roundedPhoto, left: photoLeft, top: photoTop },
      { input: Buffer.from(buildLinkLockupSvg()), left: layout.lockup.left, top: layout.lockup.top },
      { input: logo, left: logoLeft, top: logoTop },
    ])
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  // WhatsApp only renders previews under ~300 KB: step the quality down until
  // the budget holds, and refuse to return an oversized preview.
  let quality = LINK_JPEG_QUALITY;
  let output = await render(quality);
  while (output.length > LINK_MAX_BYTES && quality > 30) {
    quality -= 8;
    output = await render(quality);
  }
  if (output.length > LINK_MAX_BYTES) {
    throw new Error('link_image_too_large');
  }
  return output;
}

function buildLabelSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${LABEL_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${LABEL_HEIGHT}">
    <text x="540" y="76" fill="#9aff8f" font-family="Manrope" font-size="72" font-weight="700" letter-spacing="0.5" text-anchor="middle">Je vends sur</text>
  </svg>`;
}

function buildFooterSvg(input: ComposeStoryImageInput): string {
  const title = truncate(input.title, 60);
  const zoneLabel = input.zoneLabel.trim();
  const priceLabel = input.priceLabel.trim();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="280" viewBox="0 0 1080 280">
    <rect width="1080" height="280" fill="#39a935"/>
    <text x="76" y="72" fill="rgba(255,255,255,0.92)" font-family="Manrope" font-size="32" font-weight="500">${escapeXml(title)}</text>
    <path d="M91 111c0-12.7 10.3-23 23-23s23 10.3 23 23c0 17.2-23 43-23 43s-23-25.8-23-43zm23 9.5c5.3 0 9.5-4.2 9.5-9.5s-4.2-9.5-9.5-9.5-9.5 4.2-9.5 9.5 4.2 9.5 9.5 9.5z" fill="rgba(255,255,255,0.78)"/>
    <text x="150" y="128" fill="rgba(255,255,255,0.78)" font-family="Manrope" font-size="26" font-weight="400">${escapeXml(zoneLabel)}</text>
    <text x="76" y="224" fill="#ffffff" font-family="Sora" font-size="64" font-weight="700">${escapeXml(priceLabel)}</text>
  </svg>`;
}

function truncate(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
