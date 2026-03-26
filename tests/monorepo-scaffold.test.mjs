import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('root package exposes a workspace smoke script while preserving the website entry scripts', () => {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.equal(packageJson.scripts.build, 'node scripts/build.mjs');
  assert.equal(packageJson.scripts.start, 'node server.mjs');
  assert.equal(packageJson.scripts['smoke:app'], 'node scripts/build.mjs && test -f dist/App/index.html && test -f dist/assets/app/app.css && test -f dist/assets/app/app.js');
  assert.equal(typeof packageJson.scripts['smoke:workspaces'], 'string');
});

test('root package keeps a website compatibility smoke script during monorepo bootstrap', () => {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.equal(typeof packageJson.scripts['smoke:website'], 'string');
});

test('root monorepo workspaces are scaffolded', () => {
  const requiredFiles = [
    'pnpm-workspace.yaml',
    'apps/mobile/pubspec.yaml',
    'apps/mobile/lib/main.dart',
    'apps/mobile/lib/app.dart',
    'apps/mobile/lib/config/theme.dart',
    'apps/mobile/lib/config/routes.dart',
    'apps/api/package.json',
    'apps/api/src/main.ts',
    'apps/api/src/app.module.ts',
    'apps/admin/package.json',
    'apps/admin/src/main.ts',
  ];

  for (const file of requiredFiles) {
    assert.equal(existsSync(path.join(repoRoot, file)), true, `${file} should exist`);
  }
});

test('pnpm workspace only includes the JS workspaces', () => {
  const workspaceConfig = readFileSync(path.join(repoRoot, 'pnpm-workspace.yaml'), 'utf8');

  assert.match(workspaceConfig, /apps\/api/);
  assert.match(workspaceConfig, /apps\/admin/);
  assert.doesNotMatch(workspaceConfig, /App\//);
});
