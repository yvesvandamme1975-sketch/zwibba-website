import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const packageJsonPath = path.join(repoRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const scripts = packageJson.scripts ?? {};

assert.equal(
  scripts['smoke:monorepo'],
  'node scripts/smoke-monorepo.mjs',
  'root package must expose smoke:monorepo',
);
assert.equal(
  scripts['smoke:api-tests'],
  'pnpm -C apps/api test',
  'root package must expose smoke:api-tests',
);
assert.equal(
  scripts['smoke:admin-tests'],
  'pnpm -C apps/admin test',
  'root package must expose smoke:admin-tests',
);
assert.equal(
  scripts['smoke:mobile-tests'],
  'sh -lc "cd apps/mobile && flutter test"',
  'root package must expose smoke:mobile-tests',
);
assert.equal(scripts['dev:api'], 'sh scripts/dev-api.sh', 'root package must expose dev:api');
assert.equal(
  scripts['dev:admin'],
  'sh scripts/dev-admin.sh',
  'root package must expose dev:admin',
);

assert.equal(existsSync(path.join(repoRoot, 'scripts', 'dev-api.sh')), true, 'scripts/dev-api.sh must exist');
assert.equal(
  existsSync(path.join(repoRoot, 'scripts', 'dev-admin.sh')),
  true,
  'scripts/dev-admin.sh must exist',
);

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

execFileSync(npmCommand, ['run', 'smoke:website'], {
  cwd: repoRoot,
  stdio: 'inherit',
});
execFileSync(npmCommand, ['run', 'smoke:production-contracts'], {
  cwd: repoRoot,
  stdio: 'inherit',
});
execFileSync(npmCommand, ['run', 'smoke:workspaces'], {
  cwd: repoRoot,
  stdio: 'inherit',
});
execFileSync(npmCommand, ['run', 'smoke:api-tests'], {
  cwd: repoRoot,
  stdio: 'inherit',
});
execFileSync(npmCommand, ['run', 'smoke:admin-tests'], {
  cwd: repoRoot,
  stdio: 'inherit',
});
execFileSync(npmCommand, ['run', 'smoke:mobile-tests'], {
  cwd: repoRoot,
  stdio: 'inherit',
});
