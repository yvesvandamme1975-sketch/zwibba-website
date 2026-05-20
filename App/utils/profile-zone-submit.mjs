import { deriveProfileCityAutocompleteState } from './profile-city-autocomplete-state.mjs';
import { normalizeLocationValueForMatch } from './location-search.mjs';

export function resolveProfileAreaForSubmit({
  area = '',
  areaSearch = '',
  cityOptions = [],
  selectedArea = '',
} = {}) {
  const submittedArea = String(area ?? '').trim();
  const visibleArea = String(areaSearch ?? '').trim();

  if (!visibleArea) {
    return '';
  }

  const resolvedArea = deriveProfileCityAutocompleteState({
    cityOptions,
    inputValue: visibleArea,
    selectedArea,
  }).selectedArea;

  if (resolvedArea) {
    return resolvedArea;
  }

  if (
    submittedArea &&
    normalizeLocationValueForMatch(submittedArea) === normalizeLocationValueForMatch(visibleArea)
  ) {
    return submittedArea;
  }

  return '';
}
