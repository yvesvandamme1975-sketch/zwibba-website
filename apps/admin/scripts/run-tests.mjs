import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const pattern = process.argv[2] ?? '';
const testRoot = path.join(cwd, 'test');

function collectTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectTests(entryPath);
    }

    return entry.name.endsWith('.ts') ? [entryPath] : [];
  });
}

const matchedTests = collectTests(testRoot).filter((filePath) => {
  return pattern ? filePath.includes(pattern) : true;
});

if (matchedTests.length === 0) {
  console.error(`No admin tests matched "${pattern}".`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', ...matchedTests],
  {
    cwd,
    stdio: 'inherit',
  },
);

process.exit(result.status ?? 1);
