import {
  getMatchingLocationSuggestions,
  normalizeLocationValueForMatch,
} from './location-search.mjs';

function collapseCityLabel(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function deriveProfileCityAutocompleteState({
  cityOptions = [],
  inputValue = '',
  selectedArea = '',
} = {}) {
  const normalizedInput = normalizeLocationValueForMatch(inputValue);
  const optionLabels = cityOptions.map((item) => {
    return typeof item === 'string' ? item : item?.label;
  }).filter(Boolean);
  const suggestions = getMatchingLocationSuggestions(inputValue, optionLabels);
  const exactMatch = optionLabels.find((label) => {
    return normalizeLocationValueForMatch(label) === normalizedInput;
  }) ?? '';
  const nextSelectedArea = exactMatch
    ? exactMatch
    : normalizeLocationValueForMatch(selectedArea) === normalizedInput
      ? selectedArea
      : '';
  const missingCityLabel =
    normalizedInput && !exactMatch && suggestions.length === 0
      ? collapseCityLabel(inputValue)
      : '';

  return {
    inputValue: collapseCityLabel(inputValue),
    missingCityLabel,
    selectedArea: nextSelectedArea,
    suggestions,
  };
}
