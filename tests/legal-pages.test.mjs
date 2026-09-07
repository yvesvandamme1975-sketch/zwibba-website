import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { createLegalPolicy, loadLegalCatalog } from '../apps/api/assets/legal/catalog.mjs';
import { renderLegalDocument } from '../shared/legal-pages.mjs';

function fixture() {
  const documents = {};
  const entries = [];
  for (const locale of ['fr-BE', 'fr-CD', 'nl-BE']) {
    for (const kind of ['terms', 'privacy', 'legal-notice']) {
      const file = `2026-09-07/${kind}.${locale}.md`;
      documents[file] = `# Texte ${kind}\n\nDocument de test ${locale}.`;
      entries.push({ kind, locale, market: locale.endsWith('BE') ? 'BE' : 'CD', file,
        sha256: createHash('sha256').update(documents[file]).digest('hex') });
    }
  }
  return { manifest: { status: 'published', version: '2026-09-07', effectiveAt: '2026-09-07', documents: entries }, documents };
}

test('real unfinished legal documents never become public or required', () => {
  const policy = loadLegalCatalog();
  assert.equal(policy.active, false);
  assert.equal(policy.published, false);
  assert.deepEqual(policy.documents, []);
  assert.equal(policy.termsFor('BE'), null);
});

test('complete published catalog binds market, locale, version and exact hash', () => {
  const policy = createLegalPolicy({ ...fixture(), now: new Date('2026-09-08') });
  assert.equal(policy.active, true);
  const terms = policy.termsFor('BE');
  assert.equal(terms.locale, 'fr-BE');
  assert.equal(terms.version, '2026-09-07');
  assert.equal(terms.hash, createHash('sha256').update(terms.content).digest('hex'));
  assert.equal(policy.termsFor('BE', 'nl-BE').locale, 'nl-BE');
  assert.throws(() => policy.termsFor('CD', 'nl-BE'), /locale|langue/i);
  assert.match(terms.path, /^\/legal\/fr-BE\/terms\/$/);
});

for (const kind of ['placeholder', 'hash', 'missing language', 'draft version']) {
  test(`publication refuses ${kind}`, () => {
    const input = fixture();
    if (kind === 'placeholder') {
      const file = input.manifest.documents[0].file;
      input.documents[file] += '\n[[LEGAL_NAME]]';
      input.manifest.documents[0].sha256 = createHash('sha256').update(input.documents[file]).digest('hex');
    }
    if (kind === 'hash') input.documents[input.manifest.documents[0].file] += 'changed';
    if (kind === 'missing language') input.manifest.documents.pop();
    if (kind === 'draft version') input.manifest.version = 'draft-2026-09-07';
    assert.throws(() => createLegalPolicy(input), /document|catalog|version|empreinte|placeholder/i);
  });
}

test('future published version is consultable but not yet demanded', () => {
  const policy = createLegalPolicy({ ...fixture(), now: new Date('2026-09-06') });
  assert.equal(policy.published, true);
  assert.equal(policy.documents.length, 9);
  assert.equal(policy.active, false);
  assert.equal(policy.termsFor('CD'), null);
});

test('a running process starts requiring a published version at its effective date', () => {
  let current = new Date('2026-09-06T23:59:59Z');
  const policy = createLegalPolicy({ ...fixture(), now: () => current });
  assert.equal(policy.active, false);
  assert.equal(policy.termsFor('BE'), null);
  current = new Date('2026-09-07T00:00:00Z');
  assert.equal(policy.active, true);
  assert.equal(policy.termsFor('BE').version, '2026-09-07');
});

test('legal page renders readable headings and escapes embedded HTML', () => {
  const page = renderLegalDocument({ locale: 'fr-BE', title: 'CGU', version: 'v1', content: '# Conditions\n\nUn <script>alert(1)</script> et **texte**.' });
  assert.match(page, /<h1>Conditions<\/h1>/);
  assert.match(page, /&lt;script&gt;/);
  assert.doesNotMatch(page, /<script>/);
  assert.match(page, /<strong>texte<\/strong>/);
  assert.match(page, /name="viewport"/);
});
