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
