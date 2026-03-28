import { supportedCategoryIds, supportedConditionValues } from './ai-taxonomy';

export function buildVisionDraftPrompt() {
  return [
    'Analyse la photo produit pour un brouillon de petite annonce Zwibba.',
    'Retourne uniquement un JSON valide.',
    'Le JSON doit toujours contenir exactement les clés: title, categoryId, condition, description.',
    'title est obligatoire et doit être un titre court, naturel, spécifique au produit visible.',
    `Choisis categoryId uniquement parmi: ${supportedCategoryIds.join(', ')}.`,
    `Choisis condition uniquement parmi: ${supportedConditionValues.join(', ')}.`,
    "N'inclus jamais de prix ni de fourchette de prix.",
    'Sois conservateur: si la catégorie est incertaine, choisis electronics.',
    'Décris brièvement le produit visible sans inventer de détails invisibles.',
  ].join(' ');
}
