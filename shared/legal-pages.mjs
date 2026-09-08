function escape(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function renderLegalDocument({ content = '', title = '', locale = 'fr-BE', version = '' } = {}) {
  const safeLocale = ['fr-BE', 'fr-CD', 'nl-BE'].includes(locale) ? locale : 'fr-BE';
  const dutch = safeLocale === 'nl-BE';
  const labels = dutch ? ['Gebruiksvoorwaarden', 'Privacyverklaring', 'Juridische informatie'] : ['Conditions générales', 'Confidentialité', 'Mentions légales'];
  const navigation = ['terms', 'privacy', 'legal-notice'].map((kind, i) => `<a href="/legal/${escape(safeLocale)}/${kind}/">${escape(labels[i])}</a>`).join(' · ');
  const body = content.split(/\n\s*\n/).filter(Boolean).map(block => {
    const heading = block.match(/^(#{1,3}) (.+)$/);
    if (heading) return `<h${heading[1].length}>${escape(heading[2])}</h${heading[1].length}>`;
    return `<p>${escape(block).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replaceAll('\n', '<br>')}</p>`;
  }).join('\n');
  return `<!doctype html><html lang="${escape(safeLocale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)} | Zwibba</title><style>body{font:18px/1.6 system-ui,sans-serif;color:#152315;background:#fafcf9;margin:0}main{max-width:760px;margin:auto;padding:24px}a{color:#236a22}h1{line-height:1.2}h2{margin-top:2em}p{overflow-wrap:anywhere}small{color:#465446}</style></head><body><main><a href="/App/">Zwibba</a><article>${body}</article><nav aria-label="${dutch ? 'Juridische documenten' : 'Documents légaux'}">${navigation}</nav><small>${escape(version)}</small></main></body></html>`;
}
