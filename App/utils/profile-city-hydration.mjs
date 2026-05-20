import { normalizeLocationValueForMatch } from './location-search.mjs';

export function resolveProfileCityHydration({
  currentInput = '',
  currentSelectedArea = '',
  inputAtLoadStart = '',
  profileArea = '',
} = {}) {
  const normalizedCurrentInput = normalizeLocationValueForMatch(currentInput);
  const normalizedStartInput = normalizeLocationValueForMatch(inputAtLoadStart);
  const nextProfileArea = String(profileArea ?? '').trim();

  if (!normalizedCurrentInput || normalizedCurrentInput === normalizedStartInput) {
    return {
      inputValue: nextProfileArea,
      selectedArea: nextProfileArea,
    };
  }

  return {
    inputValue: currentInput,
    selectedArea: currentSelectedArea,
  };
}
