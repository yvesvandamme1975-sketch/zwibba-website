export const profileAreaOptions = [
  'Bel Air',
  'Golf',
  'Lubumbashi Centre',
  'Q. Industriel',
  'Kamalondo',
  'Kenya',
] as const;

export function isSupportedProfileArea(value: string) {
  return profileAreaOptions.includes(value as (typeof profileAreaOptions)[number]);
}
