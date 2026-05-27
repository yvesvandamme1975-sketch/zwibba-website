# Zwibba Share Story Image Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Générer server-side une image PNG 1080×1920 brandée par listing (header « Je vends sur » + logo Zwibba Z capital, photo carrée centrée, bandeau vert avec titre + zone + prix), bakée sur Cloudflare R2 au moment de l'approbation modération, exposée comme `og:image` sur les pages SEO `/annonce/{slug}/` et utilisable via Web Share API depuis le success-screen pour partager en WhatsApp Status / Instagram Stories / Facebook Stories.

**Architecture:** Trois couches indépendantes. **(1)** API NestJS — nouveau module `apps/api/src/share/` : module pur `compose-story-image.ts` (Sharp composite avec SVG header/footer dérivés de templates), constante `zwibba-logo.svg.ts` (logo simplifié inline, Z capital), service orchestrateur `story-image.service.ts` (Prisma load → photo download → composite → R2 put → DB update), hook dans `moderation.service.approveListing` wrapped try/catch. Migration Prisma ajoute `Listing.storyImageUrl`. Fonts Manrope + Sora packagées dans `apps/api/assets/fonts/` + `fonts.conf` minimal pointé via `FONTCONFIG_FILE`. **(2)** PWA — réécrire `App/features/post/success-screen.mjs` pour détecter `navigator.canShare({files})` et invoquer `navigator.share` avec le blob fetché de `storyImageUrl`, fallback desktop avec menu déplié 4 boutons (WhatsApp chat, Facebook sharer, download image, copier le lien). **(3)** Build SEO — modifier `scripts/build.mjs` pour override `og:image` des pages `/annonce/{slug}/` avec `storyImageUrl` quand disponible + ajouter `og:image:width/height`, `og:title` brandé et `product:price:*`.

**Tech Stack:** NestJS 11 + TypeScript + Prisma 6 + Sharp (nouvelle dépendance `apps/api/`), Vanilla JS ESM (`App/`), node `--test` runner pour les deux côtés, AWS SDK S3 vers Cloudflare R2 (déjà en place), build statique pour les pages SEO.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the "Current priority docs" list in `docs/plans/README.md`, after the latest entry, before the "Legacy docs" trailer:

```
- `2026-05-27-zwibba-share-story-image-design.md`
- `2026-05-27-zwibba-share-story-image-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "share-story-image" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index share-story-image plans"
```

---

### Task 2: Add Prisma migration for Listing.storyImageUrl

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/{timestamp}_listing_story_image_url/migration.sql`

**Step 1: Write the failing test**

Create `apps/api/test/listings/story-image-url-field.test.ts` :

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { Prisma } from '@prisma/client';

test('Listing has a nullable storyImageUrl string field', () => {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === 'Listing');
  assert.ok(model, 'Listing model exists');
  const field = model.fields.find((f) => f.name === 'storyImageUrl');
  assert.ok(field, 'storyImageUrl field exists');
  assert.equal(field.type, 'String');
  assert.equal(field.isRequired, false);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- listings/story-image-url-field`
Expected: FAIL — `storyImageUrl` field does not exist on the Listing model yet.

**Step 3: Write the minimal implementation**

In `apps/api/prisma/schema.prisma`, add to the `Listing` model:

```prisma
storyImageUrl String?
```

Place the line near `attributesJson` for grouping. Then create the migration file:

```bash
pnpm -C apps/api exec prisma migrate dev --name listing_story_image_url --create-only
```

Verify the generated SQL is `ALTER TABLE "Listing" ADD COLUMN "storyImageUrl" TEXT;` (single ADD COLUMN, no other table touched).

Then regenerate the Prisma client: `pnpm -C apps/api exec prisma generate`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- listings/story-image-url-field`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/ apps/api/test/listings/story-image-url-field.test.ts
git commit -m "feat: add nullable Listing.storyImageUrl"
```

---

### Task 3: Add sharp dependency and Zwibba logo SVG module

**Files:**
- Modify: `apps/api/package.json`
- Modify: `apps/api/pnpm-lock.yaml` (or repo-root pnpm-lock.yaml depending on workspace setup)
- Create: `apps/api/src/share/zwibba-logo.svg.ts`
- Create: `apps/api/test/share/zwibba-logo.test.ts`

**Step 1: Write the failing test**

Create `apps/api/test/share/zwibba-logo.test.ts` :

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { ZWIBBA_LOGO_SVG } from '../../src/share/zwibba-logo.svg';

test('ZWIBBA_LOGO_SVG is a string starting with <svg', () => {
  assert.ok(typeof ZWIBBA_LOGO_SVG === 'string');
  assert.match(ZWIBBA_LOGO_SVG.trimStart(), /^<svg[\s>]/);
});

test('ZWIBBA_LOGO_SVG keeps the green accent on the i dot', () => {
  assert.match(ZWIBBA_LOGO_SVG, /#39a935/i);
});

test('ZWIBBA_LOGO_SVG uses white for the main letters on dark backgrounds', () => {
  assert.match(ZWIBBA_LOGO_SVG, /#ffffff|#fff[^a-f0-9]/i);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- share/zwibba-logo`
Expected: FAIL — module does not exist.

**Step 3: Write the minimal implementation**

Read `dist/assets/brand/logo-zwibba.svg` (source of truth for the logo) and extract only the paths that draw the word « Zwibba » and the green dot on the `i`. Drop the surrounding `<defs>` style block and rewrite color references inline: replace `.st0` references with `fill="#ffffff"` and `.st1` with `fill="#39a935"`. Keep the original viewBox `0 0 841.89 595.28`.

Then add `sharp` as a dependency:

```bash
pnpm -C apps/api add sharp
```

(This will update `apps/api/package.json` and the workspace lockfile. Confirm sharp version pinned at `^0.34.0` or later — current stable.)

Create `apps/api/src/share/zwibba-logo.svg.ts` with the extracted SVG as an exported template literal string:

```ts
export const ZWIBBA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 841.89 595.28">
  <!-- extracted paths, .st0 → fill="#ffffff", .st1 → fill="#39a935" -->
  ...
</svg>`;
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- share/zwibba-logo`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/package.json apps/api/pnpm-lock.yaml pnpm-lock.yaml apps/api/src/share/zwibba-logo.svg.ts apps/api/test/share/zwibba-logo.test.ts
git commit -m "feat: add sharp dependency and Zwibba logo SVG module"
```

---

### Task 4: Package Manrope + Sora fonts with fontconfig

**Files:**
- Create: `apps/api/assets/fonts/Manrope-Regular.ttf`
- Create: `apps/api/assets/fonts/Manrope-Medium.ttf`
- Create: `apps/api/assets/fonts/Sora-Medium.ttf`
- Create: `apps/api/assets/fonts/Sora-Bold.ttf`
- Create: `apps/api/assets/fonts/fonts.conf`
- Create: `apps/api/test/share/fontconfig-bootstrap.test.ts`

**Step 1: Write the failing test**

Create `apps/api/test/share/fontconfig-bootstrap.test.ts` :

```ts
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ASSETS_FONTS = path.resolve(__dirname, '../../assets/fonts');

test('all four required TTF files exist', () => {
  for (const file of ['Manrope-Regular.ttf', 'Manrope-Medium.ttf', 'Sora-Medium.ttf', 'Sora-Bold.ttf']) {
    assert.ok(existsSync(path.join(ASSETS_FONTS, file)), `missing ${file}`);
  }
});

test('fonts.conf is a valid fontconfig file pointing at the fonts dir', () => {
  const confPath = path.join(ASSETS_FONTS, 'fonts.conf');
  assert.ok(existsSync(confPath));
  const contents = require('fs').readFileSync(confPath, 'utf-8');
  assert.match(contents, /<dir>.*<\/dir>/);
  assert.match(contents, /fontconfig/i);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- share/fontconfig-bootstrap`
Expected: FAIL — neither the TTF files nor fonts.conf exist.

**Step 3: Write the minimal implementation**

Download the four TTF files from their official Google Fonts mirrors:

- Manrope: https://fonts.google.com/specimen/Manrope (Open Font License, OK to redistribute)
- Sora: https://fonts.google.com/specimen/Sora (Open Font License, OK to redistribute)

Place them in `apps/api/assets/fonts/`. Their exact filenames must be `Manrope-Regular.ttf`, `Manrope-Medium.ttf`, `Sora-Medium.ttf`, `Sora-Bold.ttf`.

Create `apps/api/assets/fonts/fonts.conf` :

```xml
<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir prefix="default">.</dir>
  <cachedir>/tmp/zwibba-fontconfig-cache</cachedir>
</fontconfig>
```

The `<dir prefix="default">.</dir>` resolves relative to the fontconfig file location, so fontconfig will scan the `assets/fonts/` directory for the TTFs. The `<cachedir>` is writable on Railway and macOS.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- share/fontconfig-bootstrap`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/assets/fonts/
git commit -m "feat: package Manrope and Sora fonts with fontconfig"
```

---

### Task 5: Implement compose-story-image with Sharp composite

**Files:**
- Create: `apps/api/src/share/compose-story-image.ts`
- Create: `apps/api/test/share/compose-story-image.test.ts`
- Create: `apps/api/test/fixtures/sample-product.png` (small dummy PNG, ~256×256)

**Step 1: Write the failing test**

Create `apps/api/test/share/compose-story-image.test.ts` :

```ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import { composeStoryImage } from '../../src/share/compose-story-image';

const FIXTURE = path.resolve(__dirname, '../fixtures/sample-product.png');

test('composeStoryImage returns a 1080x1920 PNG buffer', async () => {
  const photoBuffer = readFileSync(FIXTURE);
  const result = await composeStoryImage({
    photoBuffer,
    title: 'Bague or blanc motif losanges',
    zoneLabel: 'Gombe, Kinshasa',
    priceLabel: '80 000 CDF',
  });

  assert.ok(Buffer.isBuffer(result));
  const meta = await sharp(result).metadata();
  assert.equal(meta.width, 1080);
  assert.equal(meta.height, 1920);
  assert.equal(meta.format, 'png');
});

test('composeStoryImage tolerates very long titles without throwing', async () => {
  const photoBuffer = readFileSync(FIXTURE);
  const result = await composeStoryImage({
    photoBuffer,
    title: 'Très très très très très très très très long titre dépassant largement le cadre normal',
    zoneLabel: 'Lemba, Kinshasa',
    priceLabel: '1 000 000 CDF',
  });

  assert.ok(Buffer.isBuffer(result));
  const meta = await sharp(result).metadata();
  assert.equal(meta.width, 1080);
  assert.equal(meta.height, 1920);
});
```

Provide a minimal `apps/api/test/fixtures/sample-product.png` (any small valid PNG works — generate with `sharp({create: {width: 256, height: 256, channels: 3, background: '#888888'}}).png().toBuffer()` and commit the result, or use an existing seed asset).

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- share/compose-story-image`
Expected: FAIL — `compose-story-image` module does not exist.

**Step 3: Write the minimal implementation**

Create `apps/api/src/share/compose-story-image.ts`. The function signature:

```ts
import sharp from 'sharp';
import { ZWIBBA_LOGO_SVG } from './zwibba-logo.svg';

export interface ComposeStoryImageInput {
  photoBuffer: Buffer;
  title: string;
  zoneLabel: string;
  priceLabel: string;
}

export async function composeStoryImage(input: ComposeStoryImageInput): Promise<Buffer> {
  // 1. canvas 1080x1920 background #0f160f
  const canvas = sharp({
    create: { width: 1080, height: 1920, channels: 4, background: '#0f160f' },
  }).png();

  // 2. resize photo to 972x972 cover
  const photo = await sharp(input.photoBuffer).resize(972, 972, { fit: 'cover' }).png().toBuffer();

  // 3. build header SVG (composite at top: 80, centered horizontally)
  const headerSvg = buildHeaderSvg();

  // 4. build footer SVG (green strip with title + zone + price, top: 1640)
  const footerSvg = buildFooterSvg(input);

  // 5. composite all layers
  return canvas
    .composite([
      { input: photo, top: 240, left: 54 },
      { input: Buffer.from(headerSvg), top: 80, left: 0 },
      { input: Buffer.from(footerSvg), top: 1640, left: 0 },
    ])
    .png()
    .toBuffer();
}

function buildHeaderSvg(): string {
  // 1080x140 SVG, two text elements aligned horizontally, centered.
  // "Je vends sur" in #9aff8f Manrope Medium 36px
  // Zwibba logo embedded at ~36px height to the right of the text, vertically centered
  // ...
}

function buildFooterSvg(input: ComposeStoryImageInput): string {
  // 1080x280 SVG, full-width green rectangle #39a935
  // text title (Manrope Medium 32px, white rgba 0.92), wrapped to two lines max with ellipsis
  // map-pin icon path + zoneLabel (Manrope Regular 26px, white rgba 0.78)
  // priceLabel (Sora Bold 64px, white)
  // ...
}
```

Implementation notes :

- Avant l'appel `sharp(...)`, exporter `FONTCONFIG_FILE` vers `apps/api/assets/fonts/fonts.conf` (chemin absolu résolu via `path.resolve(__dirname, '../../assets/fonts/fonts.conf')`) si non déjà défini dans l'env. Faire ça une seule fois au top du module via un IIFE.
- Pour le logo dans le header SVG, inline `ZWIBBA_LOGO_SVG` directement (Sharp/librsvg parse les `<svg>` nestés via `<image href="data:image/svg+xml;base64,...">`).
- Pour le wrapping du titre : pas de logique d'ellipse compliquée à ce stade — truncate à 60 caractères + « … » suffit.
- Pour le map-pin icon : path SVG inline simple (étoile à deux pétales, ~24×30 px).

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- share/compose-story-image`
Expected: PASS — both tests green.

**Step 5: Commit**

```bash
git add apps/api/src/share/compose-story-image.ts apps/api/test/share/compose-story-image.test.ts apps/api/test/fixtures/sample-product.png
git commit -m "feat: add compose-story-image with sharp composite pipeline"
```

---

### Task 6: Extend R2StorageService with putBuffer method

**Files:**
- Modify: `apps/api/src/media/r2-storage.service.ts`
- Create: `apps/api/test/media/r2-storage-put-buffer.test.ts`

**Step 1: Write the failing test**

Create `apps/api/test/media/r2-storage-put-buffer.test.ts` :

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { R2StorageService } from '../../src/media/r2-storage.service';

test('R2StorageService exposes a putBuffer method', () => {
  const service = new R2StorageService();
  assert.equal(typeof (service as any).putBuffer, 'function');
});

test('putBuffer returns the public URL composed from publicBaseUrl + objectKey', async () => {
  const service = new R2StorageService();
  // Mock S3Client.send to resolve without hitting the real bucket
  (service as any).s3Client = { send: async () => ({}) };
  const result = await (service as any).putBuffer({
    objectKey: 'listings/test-id/story.png',
    contentType: 'image/png',
    body: Buffer.from('fake-png-data'),
  });
  assert.match(result.publicUrl, /listings\/test-id\/story\.png$/);
  assert.equal(result.objectKey, 'listings/test-id/story.png');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- media/r2-storage-put-buffer`
Expected: FAIL — `putBuffer` is not defined on the service.

**Step 3: Write the minimal implementation**

In `apps/api/src/media/r2-storage.service.ts`, add a `putBuffer` method:

```ts
async putBuffer({
  body,
  contentType,
  objectKey,
}: {
  body: Buffer;
  contentType: string;
  objectKey: string;
}) {
  await this.s3Client.send(
    new PutObjectCommand({
      Body: body,
      Bucket: this.env.r2.bucket,
      ContentType: contentType,
      Key: objectKey,
    }),
  );
  return {
    objectKey,
    publicUrl: `${this.env.r2.publicBaseUrl.replace(/\/$/, '')}/${objectKey}`,
  };
}
```

Mirror the public URL composition pattern already present in `createPresignedUpload`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- media/r2-storage-put-buffer`
Expected: PASS — both tests green.

**Step 5: Commit**

```bash
git add apps/api/src/media/r2-storage.service.ts apps/api/test/media/r2-storage-put-buffer.test.ts
git commit -m "feat: add R2StorageService.putBuffer for server-side uploads"
```

---

### Task 7: Implement StoryImageService orchestrator

**Files:**
- Create: `apps/api/src/share/story-image.service.ts`
- Create: `apps/api/src/share/share.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/share/story-image.service.test.ts`

**Step 1: Write the failing test**

Create `apps/api/test/share/story-image.service.test.ts` :

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { StoryImageService } from '../../src/share/story-image.service';

function buildMocks() {
  const updates: any[] = [];
  const r2Puts: any[] = [];

  const prismaService = {
    listing: {
      findUnique: async () => ({
        id: 'l1',
        title: 'Bague or blanc motif losanges',
        primaryImageUrl: 'https://cdn.example.com/photo.jpg',
        zoneLabel: 'Gombe, Kinshasa',
        priceAmount: 80000,
        priceCurrency: 'CDF',
      }),
      update: async (args: any) => {
        updates.push(args);
        return args.data;
      },
    },
  };

  const r2StorageService = {
    putBuffer: async (args: any) => {
      r2Puts.push(args);
      return { objectKey: args.objectKey, publicUrl: `https://r2.example.com/${args.objectKey}` };
    },
  };

  // sharp composite is the real pipeline; we'll feed a tiny photo via fetch mock
  const fetchImpl = async () => ({ arrayBuffer: async () => new Uint8Array(100).buffer });

  return { prismaService, r2StorageService, updates, r2Puts, fetchImpl };
}

test('generateAndStoreForListing composes, uploads, and persists the URL', async () => {
  const mocks = buildMocks();
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl });

  const result = await service.generateAndStoreForListing('l1');

  assert.match(result.storyImageUrl, /listings\/l1\/story\.png$/);
  assert.equal(mocks.r2Puts.length, 1);
  assert.equal(mocks.r2Puts[0].objectKey, 'listings/l1/story.png');
  assert.equal(mocks.r2Puts[0].contentType, 'image/png');
  assert.equal(mocks.updates.length, 1);
  assert.equal(mocks.updates[0].where.id, 'l1');
  assert.match(mocks.updates[0].data.storyImageUrl, /listings\/l1\/story\.png$/);
});

test('generateAndStoreForListing throws when the listing is not found', async () => {
  const mocks = buildMocks();
  mocks.prismaService.listing.findUnique = async () => null;
  const service = new StoryImageService(mocks.prismaService as any, mocks.r2StorageService as any, { fetchImpl: mocks.fetchImpl });
  await assert.rejects(() => service.generateAndStoreForListing('unknown'), /not found/i);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- share/story-image.service`
Expected: FAIL — service does not exist.

**Step 3: Write the minimal implementation**

Create `apps/api/src/share/story-image.service.ts` :

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { R2StorageService } from '../media/r2-storage.service';
import { composeStoryImage } from './compose-story-image';

@Injectable()
export class StoryImageService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly r2StorageService: R2StorageService,
    private readonly options: { fetchImpl?: typeof fetch } = {},
  ) {}

  async generateAndStoreForListing(listingId: string): Promise<{ storyImageUrl: string }> {
    const listing = await this.prismaService.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      throw new Error(`Listing ${listingId} not found`);
    }

    const fetchImpl = this.options.fetchImpl ?? fetch;
    const photoResponse = await fetchImpl(listing.primaryImageUrl);
    const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());

    const pngBuffer = await composeStoryImage({
      photoBuffer,
      title: listing.title,
      zoneLabel: listing.zoneLabel ?? '',
      priceLabel: this.formatPrice(listing.priceAmount, listing.priceCurrency),
    });

    const objectKey = `listings/${listingId}/story.png`;
    const { publicUrl } = await this.r2StorageService.putBuffer({
      body: pngBuffer,
      contentType: 'image/png',
      objectKey,
    });

    await this.prismaService.listing.update({
      where: { id: listingId },
      data: { storyImageUrl: publicUrl },
    });

    return { storyImageUrl: publicUrl };
  }

  private formatPrice(amount: number | null, currency: string | null): string {
    if (!amount) return '';
    const formatted = new Intl.NumberFormat('fr-CD').format(amount);
    return `${formatted} ${currency ?? 'CDF'}`;
  }
}
```

Then create `apps/api/src/share/share.module.ts` that wires `StoryImageService`, `PrismaService`, `R2StorageService`. Register it in `apps/api/src/app.module.ts`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- share/story-image.service`
Expected: PASS — both tests green.

**Step 5: Commit**

```bash
git add apps/api/src/share/ apps/api/src/app.module.ts apps/api/test/share/story-image.service.test.ts
git commit -m "feat: add StoryImageService that bakes story images to R2"
```

---

### Task 8: Hook StoryImageService into moderation approval

**Files:**
- Modify: `apps/api/src/moderation/moderation.service.ts`
- Modify: `apps/api/src/moderation/moderation.module.ts`
- Modify: `apps/api/test/moderation/moderation-actions.e2e-spec.ts` (or create a new focused test)

**Step 1: Write the failing test**

In `apps/api/test/moderation/`, add a unit test (not e2e, to avoid the env-vars-required overhead — see existing pre-existing failures noted in CLAUDE.md) called `story-image-on-approve.test.ts`. Because the hook is fire-and-forget (`void this.storyImageService...catch(...)`), the test must wait one microtask tick after `approveListing` returns to observe the mock call:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { ModerationService } from '../../src/moderation/moderation.service';

async function flushMicrotasks() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('approveListing schedules storyImageService.generateAndStoreForListing fire-and-forget', async () => {
  const calls: string[] = [];
  const mockStoryImageService = {
    generateAndStoreForListing: async (id: string) => {
      calls.push(id);
      return { storyImageUrl: 'https://r2/listings/' + id + '/story.png' };
    },
  };
  const mockPrismaService = {
    listing: {
      findUnique: async () => ({ id: 'l1', moderationStatus: 'pending' }),
      update: async () => ({}),
    },
    moderationDecision: { upsert: async () => ({}) },
  };

  const service = new ModerationService(mockPrismaService as any, mockStoryImageService as any);
  const result = await service.approveListing('l1');

  // approveListing must return immediately (no waiting on the story image)
  assert.equal(result.status, 'approved');
  // The story image call is enqueued but may not have resolved yet.
  await flushMicrotasks();
  assert.deepEqual(calls, ['l1']);
});

test('approveListing returns successfully even when storyImageService throws', async () => {
  const mockStoryImageService = {
    generateAndStoreForListing: async () => { throw new Error('R2 unreachable'); },
  };
  const mockPrismaService = {
    listing: {
      findUnique: async () => ({ id: 'l1', moderationStatus: 'pending' }),
      update: async () => ({}),
    },
    moderationDecision: { upsert: async () => ({}) },
  };

  const service = new ModerationService(mockPrismaService as any, mockStoryImageService as any);
  await assert.doesNotReject(() => service.approveListing('l1'));
  await flushMicrotasks();
  // No unhandled rejection should occur — the catch in the implementation must swallow the error.
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- moderation/story-image-on-approve`
Expected: FAIL — `ModerationService` constructor does not accept a `StoryImageService` parameter yet.

**Step 3: Write the minimal implementation**

In `apps/api/src/moderation/moderation.service.ts`, inject `StoryImageService` in the constructor, and call it **fire-and-forget** after the prisma update inside `approveListing`:

```ts
constructor(
  private readonly prismaService: PrismaService,
  private readonly storyImageService: StoryImageService,
) {}

async approveListing(listingId: string) {
  // ... existing prisma.listing.update and moderationDecision.upsert ...

  // Fire-and-forget: do not await — the admin should not pay the latency of
  // photo download + sharp composite + R2 put. The promise's catch swallows
  // errors after logging them.
  void this.storyImageService
    .generateAndStoreForListing(listingId)
    .catch((error) => {
      console.warn(`[moderation] story image generation failed for ${listingId}`, error);
    });

  return { status: 'approved', listingId };
}
```

Then in `apps/api/src/moderation/moderation.module.ts`, import `ShareModule` to make `StoryImageService` available.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- moderation/story-image-on-approve`
Expected: PASS — both tests green.

Then run the broader moderation suite to confirm no regression: `pnpm -C apps/api test -- moderation/`.

**Step 5: Commit**

```bash
git add apps/api/src/moderation/moderation.service.ts apps/api/src/moderation/moderation.module.ts apps/api/test/moderation/story-image-on-approve.test.ts
git commit -m "feat: bake story image on listing approval"
```

---

### Task 9: Expose storyImageUrl in the listing API payload

**Files:**
- Modify: `apps/api/src/listings/listings.service.ts`
- Modify: `apps/api/test/listings/listings.e2e-spec.ts` (or unit test)

**Step 1: Write the failing test**

Add to `apps/api/test/listings/` a test asserting the listing payload includes `storyImageUrl`. If e2e specs already exist and need env vars, prefer a unit test on the serialization layer. Example shape :

```ts
test('serializeListing includes storyImageUrl when present', () => {
  const result = serializeListing({
    id: 'l1',
    title: 'X',
    storyImageUrl: 'https://r2/listings/l1/story.png',
    // ... other fields
  } as any);
  assert.equal(result.storyImageUrl, 'https://r2/listings/l1/story.png');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- listings/storyimageurl`
Expected: FAIL — the serializer does not yet propagate `storyImageUrl`.

**Step 3: Write the minimal implementation**

Identify the listing serialization function in `listings.service.ts` (likely `toListingDetail` or similar). Add `storyImageUrl: listing.storyImageUrl ?? null` to the returned object. Apply the same change to the browse feed serializer.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/api test -- listings/storyimageurl`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/listings/listings.service.ts apps/api/test/listings/
git commit -m "feat: expose storyImageUrl in listing API payloads"
```

---

### Task 10: Failing test for success-screen story image rendering

**Files:**
- Modify: `tests/success-screen.test.mjs` (create if absent)

**Step 1: Write the failing test**

Create or extend `tests/success-screen.test.mjs` :

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { renderSuccessScreen } from '../App/features/post/success-screen.mjs';

function buildApprovedContext({ storyImageUrl = null } = {}) {
  return {
    draft: {
      ai: { status: 'ready', message: '' },
      details: { title: 'Bague or blanc', area: 'Gombe', priceAmount: 80000, priceCurrency: 'CDF' },
      photos: [{ photoId: 'p1', publicUrl: 'https://cdn/photo.jpg', kind: 'primary' }],
    },
    listingUrl: 'https://zwibba.com/annonce/bague-or-blanc/',
    listingRoute: '#listing/bague-or-blanc',
    outcome: { status: 'approved', id: 'l1', storyImageUrl },
  };
}

test('success screen renders share buttons including Facebook when listing is approved', () => {
  const html = renderSuccessScreen(buildApprovedContext());
  assert.match(html, /data-action="share-whatsapp-chat"/);
  assert.match(html, /data-action="share-facebook"/);
  assert.match(html, /data-action="share-native"/);
  assert.match(html, /data-action="download-story-image"/);
});

test('success screen embeds the story image URL when present', () => {
  const html = renderSuccessScreen(buildApprovedContext({ storyImageUrl: 'https://r2/l1/story.png' }));
  assert.match(html, /data-story-image-url="https:\/\/r2\/l1\/story\.png"/);
});

test('success screen omits story-image-dependent affordances when storyImageUrl is null', () => {
  const html = renderSuccessScreen(buildApprovedContext({ storyImageUrl: null }));
  assert.doesNotMatch(html, /data-action="share-native"/);
  assert.doesNotMatch(html, /data-action="download-story-image"/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/success-screen.test.mjs`
Expected: FAIL — current success-screen has only the WhatsApp button.

**Step 3: Commit**

```bash
git add tests/success-screen.test.mjs
git commit -m "test: cover share story image affordances on success screen"
```

---

### Task 11: Rewrite success-screen with multi-platform share affordances

**Files:**
- Modify: `App/features/post/success-screen.mjs`
- Modify: `App/features/post/post-flow-controller.mjs`

**Step 1: Write the code**

In `App/features/post/success-screen.mjs`, restructure the share actions block:

- When `outcome.storyImageUrl` is present, render a `data-story-image-url="..."` attribute on the success section root, and:
  - A primary button `data-action="share-native"` (visible always; the controller hides it if `navigator.canShare({files})` is false at runtime).
  - A secondary button `data-action="download-story-image"` that downloads the image directly.
- Always render `data-action="share-whatsapp-chat"` and `data-action="share-facebook"` — these are URL-based and don't need the image.
- Keep `Copier le lien` (`data-action="copy-listing-link"`), `Voir mon annonce`, and `Booster cette annonce` as today.

In `App/features/post/post-flow-controller.mjs`, add event handlers:

- `share-native`: fetch the blob from `data-story-image-url`, call `navigator.share({title: 'Je vends sur Zwibba !', text: ..., url: ..., files: [new File([blob], 'zwibba-story.png', {type:'image/png'})]})`.
- `share-facebook`: open `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(listingUrl)}` in a new tab.
- `download-story-image`: trigger an `<a download>` click on the story image URL.
- Guard `share-native` button visibility on `navigator.share && navigator.canShare?.({files: [new File([new Blob()], 'x.png', {type:'image/png'})]})` — hide via inline `style.display='none'` if unsupported.

Update `buildWhatsAppShareUrl` so its `text` becomes `'Je vends sur Zwibba ! ${title} — ${listingUrl}'` for consistency with the brand phrase used in the story image.

**Step 2: Run test to verify it passes**

Run: `node --test tests/success-screen.test.mjs tests/post-flow.test.mjs`
Expected: PASS — all three new tests green, all existing post-flow tests still green.

**Step 3: Commit**

```bash
git add App/features/post/success-screen.mjs App/features/post/post-flow-controller.mjs
git commit -m "feat: add multi-platform share affordances on success screen"
```

---

### Task 12: Failing test for build.mjs OG meta override with story image

**Files:**
- Modify: `tests/build.test.mjs` (or create `tests/build-og-meta.test.mjs`)

**Step 1: Write the failing test**

Add a test that asserts the rendered SEO page for a listing with `storyImageUrl` uses the story image as `og:image` and includes the brand phrase in `og:title`:

```js
test('build.mjs uses storyImageUrl as og:image when available', async () => {
  // Stub or fixture a listing with storyImageUrl set, run the build pass on that listing,
  // and assert the generated HTML contains:
  // <meta property="og:image" content="<storyImageUrl>" />
  // <meta property="og:image:width" content="1080" />
  // <meta property="og:image:height" content="1920" />
  // <meta property="og:title" content="Je vends sur Zwibba ! <title>" />
  // <meta property="product:price:amount" content="80000" />
  // <meta property="product:price:currency" content="CDF" />
});

test('build.mjs falls back to primaryImageUrl when storyImageUrl is null', async () => {
  // ... opposite assertion: og:image points to primaryImageUrl, no 1080x1920 dimension hints,
  // og:title remains plain (no brand phrase prepended)
});
```

Adapt to the actual `scripts/build.mjs` test harness (read the first 40 lines of the existing `tests/build.test.mjs` before writing to match the patterns).

**Step 2: Run test to verify it fails**

Run: `node --test tests/build.test.mjs`
Expected: FAIL on the two new tests because `scripts/build.mjs` does not yet override og:image with storyImageUrl.

**Step 3: Commit**

```bash
git add tests/build.test.mjs
git commit -m "test: cover storyImageUrl override in OG meta build"
```

---

### Task 13: Implement build.mjs OG meta override

**Files:**
- Modify: `scripts/build.mjs`

**Step 1: Write the code**

In the page generation loop of `scripts/build.mjs`, when rendering `/annonce/{slug}/index.html`, if the listing object has `storyImageUrl` truthy:

- Set `og:image` to `storyImageUrl`
- Add `og:image:width` `1080` and `og:image:height` `1920`
- Prepend `'Je vends sur Zwibba ! '` to `og:title`
- Add `product:price:amount` and `product:price:currency` from listing data

Otherwise, keep the existing behaviour (og:image = primary photo URL, og:title plain title).

Read the existing template (likely in `scripts/build.mjs` or a side file `scripts/templates/listing-detail.html`) before editing.

**Step 2: Run test to verify it passes**

Run: `node --test tests/build.test.mjs`
Expected: PASS — both new tests green. Then `npm test` to confirm no regression elsewhere.

**Step 3: Commit**

```bash
git add scripts/build.mjs
git commit -m "feat: override og:image with story image url when available"
```
