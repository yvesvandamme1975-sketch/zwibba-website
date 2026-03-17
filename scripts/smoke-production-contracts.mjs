import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = '/Users/pc/zwibba-website';

function readJson(relativePath) {
  return JSON.parse(
    readFileSync(path.join(repoRoot, relativePath), 'utf8'),
  );
}

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function assertContainsAll(source, requiredValues, label) {
  for (const requiredValue of requiredValues) {
    assert.match(
      source,
      new RegExp(`\\b${requiredValue}\\b`, 'u'),
      `${label} must mention ${requiredValue}`,
    );
  }
}

const apiPackage = readJson('apps/api/package.json');
const adminPackage = readJson('apps/admin/package.json');
const apiEnvExample = readText('apps/api/.env.example');
const adminEnvExample = readText('apps/admin/.env.example');
const healthController = readText('apps/api/src/health/health.controller.ts');
const deploymentRunbookPath = path.join(
  repoRoot,
  'docs',
  'deployment',
  '2026-03-16-zwibba-railway-production.md',
);

assert.ok(apiPackage.scripts?.build, 'apps/api/package.json must define build');
assert.ok(apiPackage.scripts?.start, 'apps/api/package.json must define start');
assert.ok(adminPackage.scripts?.build, 'apps/admin/package.json must define build');
assert.ok(adminPackage.scripts?.start, 'apps/admin/package.json must define start');

assert.equal(
  existsSync(path.join(repoRoot, 'apps', 'api', 'nixpacks.toml')),
  true,
  'apps/api/nixpacks.toml must exist',
);
assert.equal(
  existsSync(path.join(repoRoot, 'apps', 'admin', 'nixpacks.toml')),
  true,
  'apps/admin/nixpacks.toml must exist',
);
assert.equal(
  existsSync(deploymentRunbookPath),
  true,
  'deployment runbook must exist',
);

assertContainsAll(
  apiEnvExample,
  [
    'DATABASE_URL',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_VERIFY_SERVICE_SID',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'R2_PUBLIC_BASE_URL',
    'R2_S3_ENDPOINT',
    'APP_BASE_URL',
  ],
  'apps/api/.env.example',
);
assertContainsAll(
  adminEnvExample,
  ['ZWIBBA_API_BASE_URL', 'ZWIBBA_ADMIN_SHARED_SECRET'],
  'apps/admin/.env.example',
);
assert.match(
  healthController,
  /Controller\('healthz'\)/u,
  'apps/api must expose /healthz',
);
