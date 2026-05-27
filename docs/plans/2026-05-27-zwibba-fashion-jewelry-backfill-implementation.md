# Zwibba Fashion Jewelry Backfill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Livrer un script CLI standalone `apps/api/scripts/backfill-fashion-jewelry.ts` qui détecte par heuristique mots-clés français les `Listing` et `Draft` mal classés (un bijou rangé sous un sous-type vêtement) et propose / applique le bon sous-type `jewelry_*`, en dry-run par défaut.

**Architecture:** Un module pur `apps/api/src/common/jewelry-text-detection.ts` (fonction `detectJewelryItemTypeFromText` + helper `proposeJewelryBackfillForRecord`) garde toute la logique heuristique testable sans Prisma. Un wrapper `apps/api/scripts/backfill-fashion-jewelry.ts` orchestre la lecture Prisma, l'agrégation, et l'écriture conditionnelle derrière `--apply --confirm-apply`. Tests via le custom node `--test` runner (`apps/api/scripts/run-tests.mjs`). Garde-fous : `DATABASE_URL` obligatoire, batch ≤ 500 records, no-op sur `categoryId !== 'fashion'`.

**Tech Stack:** NestJS 11 + TypeScript (`apps/api/`), Prisma 6, custom node `--test` runner, `tsx` pour l'exécution CLI.

---

### Task 1: Index the new planning docs

**Files:**
- Modify: `docs/plans/README.md`

**Step 1: Write the failing change**

Append the two new plan filenames to the "Current priority docs" list in `docs/plans/README.md`, after the latest entry (`2026-05-27-zwibba-jewelry-fashion-subtypes-implementation.md`), before the "Legacy docs" trailer:

```
- `2026-05-27-zwibba-fashion-jewelry-backfill-design.md`
- `2026-05-27-zwibba-fashion-jewelry-backfill-implementation.md`
```

**Step 2: Verify the diff is present**

Run: `rg -n "fashion-jewelry-backfill" docs/plans/README.md`
Expected: both new filenames appear on two separate lines.

**Step 3: Commit**

```bash
git add docs/plans/README.md
git commit -m "docs: index fashion-jewelry-backfill plans"
```

---

### Task 2: Failing test for the jewelry text detection helper

**Files:**
- Create: `apps/api/test/common/jewelry-text-detection.test.ts`

**Step 1: Write the failing test**

Create the test file with node `--test`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectJewelryItemTypeFromText,
} from '../../src/common/jewelry-text-detection';

test('detectJewelryItemTypeFromText returns jewelry_ring for bague variants', () => {
  assert.equal(detectJewelryItemTypeFromText('Bague en or blanc losanges'), 'jewelry_ring');
  assert.equal(detectJewelryItemTypeFromText('belle bague vintage'), 'jewelry_ring');
  assert.equal(detectJewelryItemTypeFromText('Alliance or 18 carats'), 'jewelry_ring');
});

test('detectJewelryItemTypeFromText returns jewelry_earrings for boucles d oreilles variants', () => {
  assert.equal(
    detectJewelryItemTypeFromText("Boucles d'oreilles fantaisie à strass"),
    'jewelry_earrings',
  );
  assert.equal(
    detectJewelryItemTypeFromText("Boucles d’oreilles dorées"),
    'jewelry_earrings',
  );
  assert.equal(
    detectJewelryItemTypeFromText('Puces d oreilles argent'),
    'jewelry_earrings',
  );
});

test('detectJewelryItemTypeFromText returns jewelry_necklace for collier variants', () => {
  assert.equal(detectJewelryItemTypeFromText('Collier en perles'), 'jewelry_necklace');
  assert.equal(detectJewelryItemTypeFromText('Pendentif coeur or'), 'jewelry_necklace');
  assert.equal(detectJewelryItemTypeFromText('Chaîne argent maille jaseron'), 'jewelry_necklace');
});

test('detectJewelryItemTypeFromText returns jewelry_bracelet for bracelet variants', () => {
  assert.equal(detectJewelryItemTypeFromText('Bracelet jonc martelé'), 'jewelry_bracelet');
  assert.equal(detectJewelryItemTypeFromText('Gourmette argent'), 'jewelry_bracelet');
});

test('detectJewelryItemTypeFromText returns jewelry_watch for montre variants', () => {
  assert.equal(detectJewelryItemTypeFromText('Montre quartz vintage'), 'jewelry_watch');
});

test('detectJewelryItemTypeFromText returns null when nothing matches', () => {
  assert.equal(detectJewelryItemTypeFromText('Robe d été à fleurs'), null);
  assert.equal(detectJewelryItemTypeFromText('T-shirt coton bio'), null);
  assert.equal(detectJewelryItemTypeFromText(''), null);
});

test('detectJewelryItemTypeFromText returns null when the text is ambiguous', () => {
  assert.equal(
    detectJewelryItemTypeFromText('Parure bague et collier assortis'),
    null,
  );
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- common/jewelry-text-detection`
Expected: FAIL — the module `jewelry-text-detection` does not exist yet, every test errors on import.

**Step 3: Commit**

```bash
git add apps/api/test/common/jewelry-text-detection.test.ts
git commit -m "test: cover jewelry-text-detection heuristic"
```

---

### Task 3: Implement the jewelry text detection helper

**Files:**
- Create: `apps/api/src/common/jewelry-text-detection.ts`

**Step 1: Write the code**

Create the module exporting `detectJewelryItemTypeFromText` and a typed `JewelryItemType` alias of the five `jewelry_*` values from `fashion-attributes.ts`. Implementation outline:

```ts
import type { FashionItemType } from './fashion-attributes';

export type JewelryItemType = Extract<
  FashionItemType,
  'jewelry_ring' | 'jewelry_earrings' | 'jewelry_necklace' | 'jewelry_bracelet' | 'jewelry_watch'
>;

interface JewelryPattern {
  itemType: JewelryItemType;
  patterns: RegExp[];
}

const jewelryPatterns: JewelryPattern[] = [
  { itemType: 'jewelry_ring', patterns: [/\bbagues?\b/, /\balliances?\b/, /\brings?\b/] },
  {
    itemType: 'jewelry_earrings',
    patterns: [
      /\bboucles?\s+d[’']?\s*oreilles?\b/,
      /\bpuces?\s+d[’']?\s*oreilles?\b/,
      /\bearrings?\b/,
    ],
  },
  {
    itemType: 'jewelry_necklace',
    patterns: [
      /\bcolliers?\b/,
      /\bpendentifs?\b/,
      /\bchaines?\b/,
      /\bsautoirs?\b/,
      /\bnecklaces?\b/,
    ],
  },
  {
    itemType: 'jewelry_bracelet',
    patterns: [/\bbracelets?\b/, /\bgourmettes?\b/, /\bjoncs?\b/, /\bmanchettes?\b/],
  },
  { itemType: 'jewelry_watch', patterns: [/\bmontres?\b/, /\bwatches?\b/] },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function detectJewelryItemTypeFromText(text: string): JewelryItemType | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const normalized = normalize(text);
  const matches = new Set<JewelryItemType>();

  for (const { itemType, patterns } of jewelryPatterns) {
    if (patterns.some((pattern) => pattern.test(normalized))) {
      matches.add(itemType);
    }
  }

  if (matches.size !== 1) {
    return null;
  }

  return matches.values().next().value as JewelryItemType;
}
```

Note: après `normalize`, les apostrophes typographiques `’` deviennent leur version ASCII via la regex qui accepte les deux. Tester finement.

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- common/jewelry-text-detection`
Expected: PASS — les 7 tests verts.

**Step 3: Commit**

```bash
git add apps/api/src/common/jewelry-text-detection.ts
git commit -m "feat: add jewelry-text-detection heuristic for backfill"
```

---

### Task 4: Failing test for the backfill record proposer

**Files:**
- Modify: `apps/api/test/common/jewelry-text-detection.test.ts`

**Step 1: Write the failing test**

Append to the existing test file:

```ts
import { proposeJewelryBackfillForRecord } from '../../src/common/jewelry-text-detection';

test('proposeJewelryBackfillForRecord returns null for non-fashion records', () => {
  assert.equal(
    proposeJewelryBackfillForRecord({
      categoryId: 'electronics',
      attributesJson: { fashion: { itemType: 'tops', size: 'M' } },
      title: 'Bague vintage',
      description: '',
    }),
    null,
  );
});

test('proposeJewelryBackfillForRecord returns null when itemType is already jewelry', () => {
  assert.equal(
    proposeJewelryBackfillForRecord({
      categoryId: 'fashion',
      attributesJson: { fashion: { itemType: 'jewelry_ring', size: '54' } },
      title: 'Bague or blanc',
      description: '',
    }),
    null,
  );
});

test('proposeJewelryBackfillForRecord proposes jewelry_ring on a misclassified bague', () => {
  const result = proposeJewelryBackfillForRecord({
    categoryId: 'fashion',
    attributesJson: { fashion: { itemType: 'dress_skirt', size: 'M' } },
    title: 'Bague en or blanc avec motif losanges',
    description: 'Bague unique, jamais portée',
  });

  assert.deepEqual(result, {
    from: { itemType: 'dress_skirt', size: 'M' },
    to: { itemType: 'jewelry_ring', size: '' },
    evidence: 'bague',
  });
});

test('proposeJewelryBackfillForRecord returns null when text is ambiguous', () => {
  assert.equal(
    proposeJewelryBackfillForRecord({
      categoryId: 'fashion',
      attributesJson: { fashion: { itemType: 'tops', size: 'M' } },
      title: 'Parure bague collier',
      description: 'Pendentif assorti',
    }),
    null,
  );
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- common/jewelry-text-detection`
Expected: FAIL — `proposeJewelryBackfillForRecord` does not exist yet, import error.

**Step 3: Commit**

```bash
git add apps/api/test/common/jewelry-text-detection.test.ts
git commit -m "test: cover proposeJewelryBackfillForRecord"
```

---

### Task 5: Implement proposeJewelryBackfillForRecord

**Files:**
- Modify: `apps/api/src/common/jewelry-text-detection.ts`

**Step 1: Write the code**

Append to the module:

```ts
const legacyClothingItemTypes = new Set([
  'tops',
  'dress_skirt',
  'jacket_sweater',
  'pants',
  'shoes',
]);

export interface JewelryBackfillProposal {
  from: { itemType: string; size: string };
  to: { itemType: JewelryItemType; size: '' };
  evidence: string;
}

export function proposeJewelryBackfillForRecord(record: {
  categoryId: string;
  attributesJson: unknown;
  title: string;
  description: string;
}): JewelryBackfillProposal | null {
  if (record.categoryId !== 'fashion') {
    return null;
  }

  const fashion =
    record.attributesJson && typeof record.attributesJson === 'object'
      ? (record.attributesJson as Record<string, unknown>).fashion
      : null;

  if (!fashion || typeof fashion !== 'object') {
    return null;
  }

  const currentItemType =
    typeof (fashion as Record<string, unknown>).itemType === 'string'
      ? ((fashion as Record<string, unknown>).itemType as string)
      : '';
  const currentSize =
    typeof (fashion as Record<string, unknown>).size === 'string'
      ? ((fashion as Record<string, unknown>).size as string)
      : '';

  if (!legacyClothingItemTypes.has(currentItemType)) {
    return null;
  }

  const combinedText = `${record.title ?? ''} ${record.description ?? ''}`;
  const detected = detectJewelryItemTypeFromText(combinedText);
  if (!detected) {
    return null;
  }

  // Recover the evidence keyword by re-applying the matched pattern set.
  const normalized = normalize(combinedText);
  const matchedPattern = jewelryPatterns
    .find((entry) => entry.itemType === detected)
    ?.patterns.find((pattern) => pattern.test(normalized));
  const evidence = matchedPattern?.exec(normalized)?.[0] ?? detected;

  return {
    from: { itemType: currentItemType, size: currentSize },
    to: { itemType: detected, size: '' },
    evidence,
  };
}
```

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- common/jewelry-text-detection`
Expected: PASS — all 11 tests green.

**Step 3: Commit**

```bash
git add apps/api/src/common/jewelry-text-detection.ts
git commit -m "feat: add proposeJewelryBackfillForRecord helper"
```

---

### Task 6: Failing test for the backfill runner

**Files:**
- Create: `apps/api/test/scripts/backfill-fashion-jewelry.test.ts`

**Step 1: Write the failing test**

Create the test that exercises the in-process runner with a mock prisma client:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { runBackfillOnce } from '../../scripts/backfill-fashion-jewelry-runner';

function buildMockPrisma(opts: { listings?: any[]; drafts?: any[]; updates?: any[] }) {
  const updates: any[] = opts.updates ?? [];
  return {
    listing: {
      findMany: async () => opts.listings ?? [],
      update: async (args: any) => {
        updates.push({ table: 'listing', ...args });
        return args.data;
      },
    },
    draft: {
      findMany: async () => opts.drafts ?? [],
      update: async (args: any) => {
        updates.push({ table: 'draft', ...args });
        return args.data;
      },
    },
    updates,
  };
}

test('runBackfillOnce dry-runs by default and never mutates', async () => {
  const prisma = buildMockPrisma({
    listings: [
      {
        id: 'l1',
        categoryId: 'fashion',
        attributesJson: { fashion: { itemType: 'dress_skirt', size: 'M' } },
        title: 'Bague or blanc',
        description: '',
      },
    ],
  });

  const result = await runBackfillOnce(prisma as any, { apply: false });

  assert.equal(result.scanned.listings, 1);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.applied.length, 0);
  assert.equal(prisma.updates.length, 0);
});

test('runBackfillOnce writes only when apply is true', async () => {
  const prisma = buildMockPrisma({
    drafts: [
      {
        id: 'd1',
        categoryId: 'fashion',
        attributesJson: { fashion: { itemType: 'tops', size: 'M' } },
        title: "Boucles d'oreilles strass",
        description: 'Fantaisie',
      },
    ],
  });

  const result = await runBackfillOnce(prisma as any, { apply: true });

  assert.equal(result.applied.length, 1);
  assert.equal(prisma.updates.length, 1);
  assert.equal(prisma.updates[0].table, 'draft');
  assert.deepEqual(prisma.updates[0].data.attributesJson, {
    fashion: { itemType: 'jewelry_earrings', size: '' },
  });
});

test('runBackfillOnce stops with a warning if there are more than 500 records to scan', async () => {
  const listings = Array.from({ length: 501 }).map((_, i) => ({
    id: `l${i}`,
    categoryId: 'fashion',
    attributesJson: { fashion: { itemType: 'tops', size: 'M' } },
    title: 'Bague',
    description: '',
  }));

  const prisma = buildMockPrisma({ listings });
  const result = await runBackfillOnce(prisma as any, { apply: true });

  assert.equal(result.aborted, true);
  assert.equal(prisma.updates.length, 0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/api test -- scripts/backfill-fashion-jewelry`
Expected: FAIL — `runBackfillOnce` module does not exist.

**Step 3: Commit**

```bash
git add apps/api/test/scripts/backfill-fashion-jewelry.test.ts
git commit -m "test: cover backfill-fashion-jewelry runner"
```

---

### Task 7: Implement the backfill runner

**Files:**
- Create: `apps/api/scripts/backfill-fashion-jewelry-runner.ts`

**Step 1: Write the code**

Create the runner module (separate from the CLI wrapper so it stays testable):

```ts
import { proposeJewelryBackfillForRecord } from '../src/common/jewelry-text-detection';

interface PrismaLike {
  listing: {
    findMany: (args?: unknown) => Promise<any[]>;
    update: (args: unknown) => Promise<any>;
  };
  draft: {
    findMany: (args?: unknown) => Promise<any[]>;
    update: (args: unknown) => Promise<any>;
  };
}

interface BackfillResult {
  scanned: { listings: number; drafts: number };
  candidates: Array<{
    table: 'listing' | 'draft';
    id: string;
    title: string;
    from: { itemType: string; size: string };
    to: { itemType: string; size: '' };
    evidence: string;
  }>;
  applied: BackfillResult['candidates'];
  aborted: boolean;
}

const MAX_RECORDS_PER_RUN = 500;

export async function runBackfillOnce(
  prisma: PrismaLike,
  options: { apply: boolean },
): Promise<BackfillResult> {
  const [listings, drafts] = await Promise.all([
    prisma.listing.findMany({ where: { categoryId: 'fashion' } }),
    prisma.draft.findMany({ where: { categoryId: 'fashion' } }),
  ]);

  const totalScanned = listings.length + drafts.length;
  if (totalScanned > MAX_RECORDS_PER_RUN) {
    return {
      scanned: { listings: listings.length, drafts: drafts.length },
      candidates: [],
      applied: [],
      aborted: true,
    };
  }

  const candidates: BackfillResult['candidates'] = [];

  for (const record of listings) {
    const proposal = proposeJewelryBackfillForRecord(record);
    if (proposal) {
      candidates.push({ table: 'listing', id: record.id, title: record.title, ...proposal });
    }
  }
  for (const record of drafts) {
    const proposal = proposeJewelryBackfillForRecord(record);
    if (proposal) {
      candidates.push({ table: 'draft', id: record.id, title: record.title, ...proposal });
    }
  }

  const applied: BackfillResult['candidates'] = [];
  if (options.apply) {
    for (const candidate of candidates) {
      const table = candidate.table === 'listing' ? prisma.listing : prisma.draft;
      await table.update({
        where: { id: candidate.id },
        data: {
          attributesJson: { fashion: { itemType: candidate.to.itemType, size: '' } },
        },
      });
      applied.push(candidate);
    }
  }

  return {
    scanned: { listings: listings.length, drafts: drafts.length },
    candidates,
    applied,
    aborted: false,
  };
}
```

**Step 2: Run test to verify it passes**

Run: `pnpm -C apps/api test -- scripts/backfill-fashion-jewelry`
Expected: PASS — all three runner tests green.

**Step 3: Commit**

```bash
git add apps/api/scripts/backfill-fashion-jewelry-runner.ts
git commit -m "feat: add backfill-fashion-jewelry runner"
```

---

### Task 8: Add the CLI wrapper

**Files:**
- Create: `apps/api/scripts/backfill-fashion-jewelry.ts`

**Step 1: Write the code**

Wrapper CLI that orchestrates env guards, prisma lifecycle, and JSON logging:

```ts
import 'reflect-metadata';

import { PrismaService } from '../src/database/prisma.service';
import { runBackfillOnce } from './backfill-fashion-jewelry-runner';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required.');
    process.exit(2);
  }

  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const confirmed = argv.includes('--confirm-apply');

  if (apply && !confirmed) {
    console.error('--apply requires --confirm-apply to avoid accidents.');
    process.exit(2);
  }

  const prisma = new PrismaService();
  try {
    const result = await runBackfillOnce(prisma as any, { apply: apply && confirmed });
    console.log(
      JSON.stringify(
        {
          mode: apply && confirmed ? 'apply' : 'dry-run',
          ...result,
        },
        null,
        2,
      ),
    );
    if (result.aborted) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**Step 2: Verify the wrapper compiles**

Run: `pnpm -C apps/api exec tsc --noEmit scripts/backfill-fashion-jewelry.ts`
Expected: no errors. If `tsc --noEmit` on a single file is not configured, run `pnpm -C apps/api exec tsc --noEmit` and confirm no new errors are reported relative to the baseline before this commit.

**Step 3: Commit**

```bash
git add apps/api/scripts/backfill-fashion-jewelry.ts
git commit -m "feat: add backfill-fashion-jewelry CLI wrapper"
```

---

### Task 9: Document the runbook in docs/plans

**Files:**
- Modify: `docs/plans/2026-05-27-zwibba-fashion-jewelry-backfill-design.md`

**Step 1: Write the code**

Append a "Runbook" appendix at the very end of the design document, copy of section 5 of Recommended Architecture in concrete form:

```
## Runbook

1. `git checkout codex/website-vitrine-backup && git pull --ff-only origin codex/website-vitrine-backup`
2. `pnpm -C apps/api install`
3. Dry-run: `pnpm -C apps/api exec tsx scripts/backfill-fashion-jewelry.ts`
4. Read the JSON, verify each candidate's `evidence` and `to.itemType`. If any candidate looks wrong, stop and patch the heuristic before applying.
5. Apply: `pnpm -C apps/api exec tsx scripts/backfill-fashion-jewelry.ts --apply --confirm-apply`
6. Save the resulting JSON to `_proj/zwibba/backfills/2026-05-27.md` in the Obsidian vault for audit.
```

**Step 2: Verify the diff is present**

Run: `rg -n "Runbook" docs/plans/2026-05-27-zwibba-fashion-jewelry-backfill-design.md`
Expected: one match on the `## Runbook` heading.

**Step 3: Commit**

```bash
git add docs/plans/2026-05-27-zwibba-fashion-jewelry-backfill-design.md
git commit -m "docs: add runbook appendix to fashion-jewelry-backfill design"
```
