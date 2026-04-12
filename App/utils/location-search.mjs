function normalizeLocationValue(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeLocationValueForMatch(value) {
  return normalizeLocationValue(value);
}

export function getMatchingLocationSuggestions(query, labels, limit = 6) {
  const normalizedQuery = normalizeLocationValue(query);

  if (!normalizedQuery) {
    return [];
  }

  const uniqueLabels = Array.from(new Set(labels.filter(Boolean)));

  return uniqueLabels
    .map((label) => {
      const normalizedLabel = normalizeLocationValue(label);
      const isExact = normalizedLabel === normalizedQuery;
      const isPrefix = normalizedLabel.startsWith(normalizedQuery);
      const contains = normalizedLabel.includes(normalizedQuery);

      if (!isExact && !isPrefix && !contains) {
        return null;
      }

      return {
        label,
        rank: isExact ? 0 : isPrefix ? 1 : 2,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.rank - right.rank || left.label.localeCompare(right.label, 'fr'))
    .slice(0, limit)
    .map((item) => item.label);
}
