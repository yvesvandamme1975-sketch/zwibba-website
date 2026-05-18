import { deriveProfileCityAutocompleteState } from './profile-city-autocomplete-state.mjs';

export function resolveProfileAreaForSubmit({
  area = '',
  areaSearch = '',
  cityOptions = [],
  selectedArea = '',
} = {}) {
  const submittedArea = String(area ?? '').trim();

  if (submittedArea) {
    return submittedArea;
  }

  return deriveProfileCityAutocompleteState({
    cityOptions,
    inputValue: areaSearch,
    selectedArea,
  }).selectedArea;
}
