import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJsonPath = path.join(repoRoot, 'package.json');
const testerDocPath = path.join(
  repoRoot,
  'docs',
  'deployment',
  '2026-04-05-zwibba-internal-beta-device-qa.md',
);

test('root package exposes canonical live beta e2e scripts', () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

  assert.equal(
    typeof packageJson.scripts?.['test:e2e:seller:beta'],
    'string',
    'package.json must define test:e2e:seller:beta',
  );
  assert.equal(
    typeof packageJson.scripts?.['test:e2e:messages:beta'],
    'string',
    'package.json must define test:e2e:messages:beta',
  );
  assert.equal(
    typeof packageJson.scripts?.['test:e2e:matrix:beta'],
    'string',
    'package.json must define test:e2e:matrix:beta',
  );
  assert.equal(
    typeof packageJson.scripts?.['test:e2e:beta'],
    'string',
    'package.json must define test:e2e:beta',
  );
});

test('internal beta device QA runbook exists with real-device coverage and tester accounts', () => {
  assert.equal(existsSync(testerDocPath), true, 'internal beta QA doc must exist');

  const contents = readFileSync(testerDocPath, 'utf8');

  assert.match(contents, /iPhone Safari/u);
  assert.match(contents, /Android Chrome/u);
  assert.match(contents, /Desktop/u);
  assert.match(contents, /\+243990000001/u);
  assert.match(contents, /\+243990000002/u);
  assert.match(contents, /\+243990000004/u);
  assert.match(contents, /generic test account/i);
  assert.match(contents, /123456/u);
  assert.match(contents, /seller flow/u);
  assert.match(contents, /messaging flow/u);
});
