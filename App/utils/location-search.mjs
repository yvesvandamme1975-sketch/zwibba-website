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

const congoCityPriority = new Map([
  'kinshasa',
  'lubumbashi',
  'likasi',
  'kolwezi',
  'goma',
  'bukavu',
  'kisangani',
  'mbuji-mayi',
  'kananga',
  'matadi',
  'beni',
  'butembo',
  'bunia',
  'tshikapa',
  'uvira',
].map((label, index) => [label, index]));

function getLocationLabel(option) {
  return typeof option === 'string' ? option : option?.label;
}

function getLocationSourceRank(option) {
  if (typeof option === 'string') {
    return 0;
  }

  return option?.sourceType === 'user_suggested' ? 1 : 0;
}

function getCongoCityPriorityRank(label) {
  const normalizedLabel = normalizeLocationValue(label);

  if (congoCityPriority.has(normalizedLabel)) {
    return congoCityPriority.get(normalizedLabel);
  }

  for (const [city, rank] of congoCityPriority) {
    if (normalizedLabel.startsWith(`${city} `) || normalizedLabel.startsWith(`${city}-`)) {
      return rank;
    }
  }

  return Number.POSITIVE_INFINITY;
}

function uniqueLocationOptions(options) {
  const uniqueByNormalizedLabel = new Map();

  for (const option of options) {
    const label = getLocationLabel(option);
    const normalizedLabel = normalizeLocationValue(label);

    if (!normalizedLabel) {
      continue;
    }

    const existing = uniqueByNormalizedLabel.get(normalizedLabel);

    if (!existing || getLocationSourceRank(option) < getLocationSourceRank(existing.option)) {
      uniqueByNormalizedLabel.set(normalizedLabel, {
        label,
        option,
      });
    }
  }

  return Array.from(uniqueByNormalizedLabel.values());
}

export function getMatchingLocationSuggestions(query, locationOptions, limit = 6) {
  const normalizedQuery = normalizeLocationValue(query);

  if (!normalizedQuery) {
    return [];
  }

  return uniqueLocationOptions(locationOptions)
    .map(({ label, option }) => {
      const normalizedLabel = normalizeLocationValue(label);
      const isExact = normalizedLabel === normalizedQuery;
      const isPrefix = normalizedLabel.startsWith(normalizedQuery);
      const contains = normalizedLabel.includes(normalizedQuery);

      if (!isExact && !isPrefix && !contains) {
        return null;
      }

      return {
        label,
        priorityRank: getCongoCityPriorityRank(label),
        rank: isExact ? 0 : isPrefix ? 1 : 2,
        sourceRank: getLocationSourceRank(option),
      };
    })
    .filter(Boolean)
    .sort((left, right) => {
      return left.rank - right.rank ||
        left.sourceRank - right.sourceRank ||
        left.priorityRank - right.priorityRank ||
        left.label.localeCompare(right.label, 'fr');
    })
    .slice(0, limit)
    .map((item) => item.label);
}
