export function normalizeLocationLabel(label: string) {
  return label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function canonicalizeLocationLabel(label: string) {
  return label
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      return word
        .split('-')
        .map((segment) => {
          if (!segment) {
            return segment;
          }

          return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
        })
        .join('-');
    })
    .join(' ');
}
