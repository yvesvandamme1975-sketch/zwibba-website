import { supportedCategoryIds, supportedConditionValues } from './ai-taxonomy';

export function buildVisionDraftPrompt() {
  return [
    'Analyse la photo produit pour un brouillon de petite annonce Zwibba.',
    'Retourne uniquement un JSON valide.',
    'Le JSON doit toujours contenir les clés: title, categoryId, condition, description.',
    "Pour la catégorie fashion uniquement, tu peux aussi ajouter itemType et size si l'étiquette ou l'image les montre clairement.",
    'title est obligatoire et doit être un titre court, naturel, spécifique au produit visible.',
    `Choisis categoryId uniquement parmi: ${supportedCategoryIds.join(', ')}.`,
    `Choisis condition uniquement parmi: ${supportedConditionValues.join(', ')}.`,
    'Si categoryId vaut fashion, choisis itemType uniquement parmi: shoes, pants, tops, dress_skirt, jacket_sweater.',
    "N'ajoute size que si itemType est clair et si la taille est explicitement visible.",
    "N'inclus jamais de prix ni de fourchette de prix.",
    'Sois conservateur: si la catégorie est incertaine, choisis electronics.',
    "N'utilise pas emploi sans indice clair de recrutement ou d'offre d'emploi.",
    "N'utilise pas music pour un simple appareil audio générique comme un haut-parleur ou un casque.",
    "Entre deux rubriques proches, préfère une catégorie plus large et sûre plutôt qu'une catégorie spécifique incertaine.",
    "Décris brièvement uniquement l'objet principal à vendre.",
    "Ignore l'arrière-plan, le décor, l'environnement, la table, le bureau, les sites web, les onglets ou tout élément autour qui ne fait pas partie du produit.",
    'Décris le produit visible sans inventer de détails invisibles.',
  ].join(' ');
}
