export function sellerMonogram(name) {
  const cleanedName = String(name ?? '').trim();

  if (!cleanedName) {
    return 'Z';
  }

  return cleanedName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'Z';
}
