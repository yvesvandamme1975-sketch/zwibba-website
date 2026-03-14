export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function escapeAttribute(value = '') {
  return escapeHtml(value);
}

export function formatCdf(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return '—';
  }

  return `${new Intl.NumberFormat('fr-FR').format(Number(value))} CDF`;
}
