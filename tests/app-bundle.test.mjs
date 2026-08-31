import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Isolated dist dir so parallel test files never wipe each other's build output.
const distDir = mkdtempSync(path.join(tmpdir(), 'zwibba-app-bundle-test-dist-'));

after(() => {
  rmSync(distDir, { force: true, recursive: true });
});

let cachedBundle = null;

function appBundle() {
  if (cachedBundle === null) {
    execFileSync('node', ['scripts/build.mjs'], {
      cwd: repoRoot,
      env: { ...process.env, ZWIBBA_DIST_DIR: distDir },
      stdio: 'pipe',
    });
    cachedBundle = readFileSync(path.join(distDir, 'assets', 'app', 'app.js'), 'utf8');
  }

  return cachedBundle;
}

// Le point d'entrée servi au navigateur doit être un bundle autonome : en ESM
// natif il tirait ~75 modules imbriqués, soit autant d'allers-retours jusqu'à
// l'origine au premier chargement (5,3 s de DOMContentLoaded en fibre, pire en
// 3G sur le marché RDC).
test('le point d’entrée de l’app est bundlé sans import relatif restant', () => {
  const bundle = appBundle();
  const relativeImports = bundle.match(
    /(?:^|[\s;}])(?:import|export)\s*(?:[\w*{][^;]*?\s*from\s*)?["'](\.{1,2}\/[^"']*)["']/g,
  );

  assert.equal(
    relativeImports,
    null,
    `le bundle ne doit plus importer de module relatif (trouvé: ${JSON.stringify(relativeImports)})`,
  );
});

test('le bundle inline le code des modules profonds de l’app', () => {
  const bundle = appBundle();

  // services/api-config.mjs — importé par l'entrée.
  assert.match(bundle, /https:\/\/api\.zwibba\.com/);
  // utils/fashion-attributes.mjs — importé de façon transitive, plusieurs niveaux plus bas.
  assert.match(bundle, /Boucles d'oreilles/);
  // shared/listing-images.mjs — hors de App/, atteint via demo-preview-assets.mjs.
  assert.ok(
    existsSync(path.join(repoRoot, 'shared', 'listing-images.mjs')),
    'le module partagé doit exister pour que le bundle puisse le résoudre',
  );
});

test('le bundle expose une sourcemap externe', () => {
  const bundle = appBundle();

  assert.match(bundle, /\/\/# sourceMappingURL=app\.js\.map/);
  assert.ok(
    existsSync(path.join(distDir, 'assets', 'app', 'app.js.map')),
    'la sourcemap doit être écrite à côté du bundle',
  );

  const sourceMap = JSON.parse(readFileSync(path.join(distDir, 'assets', 'app', 'app.js.map'), 'utf8'));
  assert.ok(Array.isArray(sourceMap.sources) && sourceMap.sources.length > 1, 'la sourcemap doit lister les modules sources');
});

// Les modules .mjs bruts restent copiés dans dist/ : ils ne sont plus chargés par
// le navigateur mais servent de filet (tests, debug, imports directs éventuels).
test('les modules sources restent disponibles dans dist', () => {
  appBundle();

  assert.ok(existsSync(path.join(distDir, 'assets', 'app', 'services', 'api-config.mjs')));
  assert.ok(existsSync(path.join(distDir, 'assets', 'shared', 'listing-images.mjs')));
});
