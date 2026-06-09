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

export async function composeStoryImage(input: ComposeStoryImageInput): Promise<Buffer> {
  const canvas = sharp({
    create: { width: 1080, height: 1920, channels: 4, background: '#0f160f' },
  }).png();

  const photo = await sharp(input.photoBuffer).resize(972, 972, { fit: 'cover' }).png().toBuffer();
  const headerSvg = buildHeaderSvg();
  const footerSvg = buildFooterSvg(input);

  return canvas
    .composite([
      { input: photo, top: 280, left: 54 },
      { input: Buffer.from(headerSvg), top: 60, left: 0 },
      { input: Buffer.from(footerSvg), top: 1640, left: 0 },
    ])
    .png()
    .toBuffer();
}

function buildHeaderSvg(): string {
  const logoData = Buffer.from(ZWIBBA_LOGO_SVG).toString('base64');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="200" viewBox="0 0 1080 200">
    <text x="540" y="100" fill="#9aff8f" font-family="Manrope" font-size="56" font-weight="600" text-anchor="middle">Je vends sur</text>
    <image x="330" y="110" width="420" height="80" href="data:image/svg+xml;base64,${logoData}" preserveAspectRatio="xMidYMid meet"/>
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
