import { resolveDemoPreviewUrl } from './demo-preview-assets.mjs';

export const sellerCategories = [
  { id: 'phones_tablets', label: 'Téléphones' },
  { id: 'electronics', label: 'Électronique' },
  { id: 'vehicles', label: 'Véhicules' },
  { id: 'real_estate', label: 'Immobilier' },
  { id: 'fashion', label: 'Mode' },
  { id: 'home_garden', label: 'Maison' },
];

export const featuredListings = [
  {
    id: 'featured-1',
    title: 'Samsung Galaxy A54 neuf',
    priceLabel: '450 000 CDF',
    location: 'Bel Air, Lubumbashi',
    publishedAt: 'Il y a 18 min',
  },
  {
    id: 'featured-2',
    title: 'Appartement 2 chambres',
    priceLabel: '1 200 000 CDF',
    location: 'Q. Industriel, Lubumbashi',
    publishedAt: 'Il y a 31 min',
  },
];

export const recentListings = [
  {
    id: 'recent-1',
    title: 'Canapé trois places style contemporain',
    priceLabel: '700 000 CDF',
    location: 'Golf, Lubumbashi',
    publishedAt: 'Il y a 42 min',
  },
  {
    id: 'recent-2',
    title: 'Ordinateur portable HP EliteBook',
    priceLabel: '1 100 000 CDF',
    location: 'Lubumbashi Centre',
    publishedAt: 'Il y a 53 min',
  },
];

export const demoCaptureOptions = [
  {
    id: 'phone-front',
    label: 'Téléphone premium',
    description: 'Bon test pour déclencher les photos guidées d’un smartphone.',
    previewUrl: resolveDemoPreviewUrl('phone-front', 'phones_tablets'),
    sizeBytes: 3_400_000,
    accent: '#6BE66B',
    glow: 'rgba(107, 230, 107, 0.32)',
  },
  {
    id: 'sofa-showroom',
    label: 'Canapé salon',
    description: 'Démo maison et jardin avec prix conseillé et vues latérales.',
    previewUrl: resolveDemoPreviewUrl('sofa-showroom', 'home_garden'),
    sizeBytes: 2_600_000,
    accent: '#9effb6',
    glow: 'rgba(158, 255, 182, 0.22)',
  },
  {
    id: 'vehicle-front',
    label: 'SUV en vente',
    description: 'Déclenche les vues guidées avant, profil et tableau de bord.',
    previewUrl: resolveDemoPreviewUrl('vehicle-front', 'vehicles'),
    sizeBytes: 3_900_000,
    accent: '#9dc6ff',
    glow: 'rgba(157, 198, 255, 0.24)',
  },
];

export { resolveDemoPreviewUrl };

export const areaOptions = [
  'Bel Air',
  'Golf',
  'Lubumbashi Centre',
  'Q. Industriel',
  'Kamalondo',
  'Kenya',
];

export const conditionOptions = [
  { value: 'new_item', label: 'Neuf' },
  { value: 'like_new', label: 'Comme neuf' },
  { value: 'used_good', label: 'Bon état' },
  { value: 'used_fair', label: 'État correct' },
  { value: 'used_poor', label: 'Usé' },
  { value: 'for_parts', label: 'Pour pièces' },
];
