import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = '/Users/pc/zwibba-website';
const apiPackagePath = path.join(repoRoot, 'apps', 'api', 'package.json');
const adminPackagePath = path.join(repoRoot, 'apps', 'admin', 'package.json');
const apiNixpacksPath = path.join(repoRoot, 'apps', 'api', 'nixpacks.toml');
const adminNixpacksPath = path.join(repoRoot, 'apps', 'admin', 'nixpacks.toml');
const deploymentDocPath = path.join(
  repoRoot,
  'docs',
  'deployment',
  '2026-03-16-zwibba-railway-production.md',
);

const requiredApiEnvVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'APP_BASE_URL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_VERIFY_SERVICE_SID',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_BASE_URL',
  'R2_S3_ENDPOINT',
];

const requiredAdminEnvVars = [
  'PORT',
  'ZWIBBA_API_BASE_URL',
  'ZWIBBA_ADMIN_SHARED_SECRET',
];

test('api and admin packages expose Railway-ready build and start scripts', () => {
  const apiPackage = JSON.parse(readFileSync(apiPackagePath, 'utf8'));
  const adminPackage = JSON.parse(readFileSync(adminPackagePath, 'utf8'));
  const rootPackage = JSON.parse(
    readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
  );

  assert.ok(apiPackage.scripts?.build, 'apps/api/package.json must define build');
  assert.ok(apiPackage.scripts?.start, 'apps/api/package.json must define start');
  assert.ok(adminPackage.scripts?.build, 'apps/admin/package.json must define build');
  assert.ok(adminPackage.scripts?.start, 'apps/admin/package.json must define start');
  assert.equal(
    rootPackage.scripts?.['smoke:production-contracts'],
    'node scripts/smoke-production-contracts.mjs',
    'root package must expose smoke:production-contracts',
  );
});

test('api and admin define Nixpacks config for Railway services', () => {
  assert.equal(existsSync(apiNixpacksPath), true, 'apps/api/nixpacks.toml must exist');
  assert.equal(existsSync(adminNixpacksPath), true, 'apps/admin/nixpacks.toml must exist');
});

test('Railway production runbook lists every required env variable and setup step', () => {
  assert.equal(existsSync(deploymentDocPath), true, 'deployment runbook must exist');

  const contents = readFileSync(deploymentDocPath, 'utf8');

  for (const envVar of requiredApiEnvVars) {
    assert.match(
      contents,
      new RegExp(`\\b${envVar}\\b`, 'u'),
      `deployment runbook must mention ${envVar}`,
    );
  }

  for (const envVar of requiredAdminEnvVars) {
    assert.match(
      contents,
      new RegExp(`\\b${envVar}\\b`, 'u'),
      `deployment runbook must mention ${envVar}`,
    );
  }

  assert.match(contents, /Railway/u, 'runbook must mention Railway');
  assert.match(contents, /Postgres/u, 'runbook must mention Postgres');
  assert.match(contents, /Cloudflare R2/u, 'runbook must mention Cloudflare R2');
  assert.match(contents, /Twilio Verify/u, 'runbook must mention Twilio Verify');
  assert.match(contents, /healthz/u, 'runbook must mention the API health check');
});
