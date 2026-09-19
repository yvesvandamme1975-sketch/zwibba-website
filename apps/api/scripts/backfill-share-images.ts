import 'reflect-metadata';

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { PrismaService } from '../src/database/prisma.service';
import { R2StorageService } from '../src/media/r2-storage.service';
import { StoryImageService } from '../src/share/story-image.service';
import {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  rollbackLinkImageBackfill,
  runLinkImageBackfill,
  type BackfillManifest,
} from './backfill-share-images-runner';

/**
 * Bounded backfill of the branded link preview ("Je vends sur Zwibba").
 *
 *   dry-run (default):  tsx scripts/backfill-share-images.ts [--limit N]
 *   apply:              tsx scripts/backfill-share-images.ts --apply --confirm-apply [--limit N] [--manifest-dir DIR]
 *   rollback:           tsx scripts/backfill-share-images.ts --rollback path/to/manifest.json
 *
 * Only `shareImageUrl` is regenerated; `story.png` is never touched. The
 * manifest is written before the first write and after every result.
 */

function readFlag(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function writeAtomically(filePath: string, value: unknown) {
  const temp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(temp, JSON.stringify(value, null, 2));
  renameSync(temp, filePath);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required.');
    process.exit(2);
  }

  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const confirmed = argv.includes('--confirm-apply');
  const rollbackPath = readFlag(argv, '--rollback');
  const limitFlag = readFlag(argv, '--limit');
  const limit = limitFlag === undefined ? DEFAULT_LIMIT : Number(limitFlag);
  const manifestDir = readFlag(argv, '--manifest-dir') ?? path.resolve(process.cwd(), '.backfill-share-images');

  if (apply && !confirmed) {
    console.error('--apply requires --confirm-apply to avoid accidents.');
    process.exit(2);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    console.error(`--limit must be an integer between 1 and ${MAX_LIMIT}.`);
    process.exit(2);
  }

  const prisma = new PrismaService();
  try {
    if (rollbackPath) {
      const manifest = JSON.parse(readFileSync(rollbackPath, 'utf8')) as BackfillManifest;
      if (manifest.version !== 1 || !Array.isArray(manifest.entries)) {
        throw new Error('manifest_invalid');
      }
      const result = await rollbackLinkImageBackfill(prisma as any, manifest);
      console.log(JSON.stringify({ mode: 'rollback', manifest: rollbackPath, ...result }, null, 2));
      return;
    }

    const service = new StoryImageService(prisma, new R2StorageService());
    let manifestPath: string | undefined;
    if (apply && confirmed) {
      mkdirSync(manifestDir, { recursive: true });
      manifestPath = path.join(manifestDir, `backfill-share-images-${new Date().toISOString().replaceAll(':', '-')}.json`);
    }
    const result = await runLinkImageBackfill(prisma as any, service, {
      apply: apply && confirmed,
      limit,
      persist: manifestPath ? async (manifest) => writeAtomically(manifestPath!, manifest) : undefined,
    });
    console.log(JSON.stringify({ ...result, manifest: undefined, manifestPath }, null, 2));
    if (result.failed.length) {
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
