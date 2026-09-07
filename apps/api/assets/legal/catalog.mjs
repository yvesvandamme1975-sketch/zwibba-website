import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const LOCALES = ['fr-BE', 'fr-CD', 'nl-BE'];
const KINDS = ['terms', 'privacy', 'legal-notice'];
const TITLES = {
  fr: { terms: 'Conditions générales d’utilisation', privacy: 'Confidentialité', 'legal-notice': 'Mentions légales' },
  nl: { terms: 'Gebruiksvoorwaarden', privacy: 'Privacyverklaring', 'legal-notice': 'Juridische informatie' },
};

export function createLegalPolicy({ manifest, documents = {}, now = new Date() }) {
  if (!['draft', 'published'].includes(manifest?.status)) throw new Error('Invalid legal catalog status');
  if (manifest.status === 'draft') return { active: false, published: false, version: manifest.version, documents: [], termsFor: () => null };
  if (!/^\d{4}-\d{2}-\d{2}(?:\.\d+)?$/.test(manifest.version)) throw new Error('Invalid published legal version');
  const effectiveAt = Date.parse(manifest.effectiveAt);
  if (!Number.isFinite(effectiveAt)) throw new Error('Invalid legal catalog effective date');
  const entries = manifest.documents || [];
  if (entries.length !== LOCALES.length * KINDS.length) throw new Error('Incomplete legal document catalog');
  const result = [];
  for (const locale of LOCALES) {
    for (const kind of KINDS) {
      const matches = entries.filter(entry => entry.locale === locale && entry.kind === kind);
      if (matches.length !== 1 || matches[0].market !== locale.slice(-2)) throw new Error('Invalid legal document locale');
      const entry = matches[0];
      const content = documents[entry.file];
      if (!content?.trim() || /\[\[|draft-\d|PROJET\s*[—–-]|ONTWERP\s*[—–-]/i.test(content)) throw new Error('Unfinished legal document placeholder');
      const hash = createHash('sha256').update(content).digest('hex');
      if (hash !== entry.sha256) throw new Error('Legal document empreinte mismatch');
      result.push({ kind, locale, market: entry.market, version: manifest.version, hash, content,
        title: TITLES[locale.slice(0, 2)][kind], path: `/legal/${locale}/${kind}/`, effectiveAt: manifest.effectiveAt });
    }
  }
  const active = now.getTime() >= effectiveAt;
  return {
    published: true, active, version: manifest.version, documents: result,
    termsFor(market, locale = market === 'BE' ? 'fr-BE' : 'fr-CD') {
      if (!active) return null;
      const terms = result.find(item => item.kind === 'terms' && item.market === market && item.locale === locale);
      if (!terms) throw new Error('Invalid legal document locale');
      return terms;
    },
  };
}

export function loadLegalCatalog({ manifestUrl = new URL('./manifest.json', import.meta.url), now } = {}) {
  const manifest = JSON.parse(readFileSync(manifestUrl, 'utf8'));
  const documents = {};
  for (const entry of manifest.documents || []) {
    if (!/^[a-zA-Z0-9.-]+\/[a-zA-Z0-9.-]+\.md$/.test(entry.file)) throw new Error('Invalid legal document path');
    documents[entry.file] = readFileSync(new URL(entry.file, manifestUrl), 'utf8');
  }
  return createLegalPolicy({ manifest, documents, now });
}
