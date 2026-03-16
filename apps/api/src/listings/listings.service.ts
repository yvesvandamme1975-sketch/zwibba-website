import { Injectable, NotFoundException } from '@nestjs/common';

type ListingRecord = {
  categoryLabel: string;
  contactActions: ('whatsapp' | 'sms' | 'call')[];
  locationLabel: string;
  priceCdf: number;
  safetyTips: string[];
  seller: {
    name: string;
    responseTime: string;
    role: string;
  };
  slug: string;
  summary: string;
  title: string;
};

const listingFixtures: ListingRecord[] = [
  {
    slug: 'samsung-galaxy-a54-neuf-lubumbashi',
    title: 'Samsung Galaxy A54 neuf sous emballage',
    categoryLabel: 'Téléphones & Tablettes',
    priceCdf: 450000,
    locationLabel: 'Lubumbashi, Bel Air',
    summary: 'Smartphone Samsung garanti, 128 Go, avec câble et coque transparente. Idéal pour démarrer vite.',
    seller: {
      name: 'Patrick Mobile',
      role: 'Vendeur pro',
      responseTime: 'Répond en moyenne en 9 min',
    },
    safetyTips: [
      'Rencontrez le vendeur dans un lieu public.',
      'Vérifiez le produit avant de payer.',
    ],
    contactActions: ['whatsapp', 'sms', 'call'],
  },
  {
    slug: 'appartement-2-chambres-quartier-industriel',
    title: 'Appartement 2 chambres quartier Industriel',
    categoryLabel: 'Immobilier',
    priceCdf: 1200000,
    locationLabel: 'Lubumbashi, Quartier Industriel',
    summary: 'Appartement lumineux avec eau et sécurité, proche des grands axes.',
    seller: {
      name: 'Nadine Habitat',
      role: 'Particulier',
      responseTime: 'Répond en moyenne en 14 min',
    },
    safetyTips: [
      'Visitez le logement en journée.',
      'Confirmez les conditions de location sur place.',
    ],
    contactActions: ['whatsapp', 'sms', 'call'],
  },
  {
    slug: 'toyota-hilux-2019-4x4',
    title: 'Toyota Hilux 2019 diesel 4x4',
    categoryLabel: 'Véhicules',
    priceCdf: 45000000,
    locationLabel: 'Lubumbashi, Golf Plateau',
    summary: 'Pick-up 4x4 solide pour la ville et le terrain. Historique d’entretien disponible pendant la visite.',
    seller: {
      name: 'Garage Plateau',
      role: 'Vendeur pro',
      responseTime: 'Répond en moyenne en 22 min',
    },
    safetyTips: [
      'Demandez les papiers du véhicule avant l’essai.',
      'Faites vérifier le véhicule avant paiement.',
    ],
    contactActions: ['whatsapp', 'sms', 'call'],
  },
  {
    slug: 'ordinateur-portable-hp-elitebook',
    title: 'Ordinateur portable HP EliteBook',
    categoryLabel: 'Électronique',
    priceCdf: 690000,
    locationLabel: 'Lubumbashi, Ruashi',
    summary: 'Portable professionnel reconditionné, SSD rapide, batterie correcte.',
    seller: {
      name: 'Informatique Ruashi',
      role: 'Vendeur pro',
      responseTime: 'Répond en moyenne en 16 min',
    },
    safetyTips: [
      'Testez l’allumage et la batterie avant de conclure.',
      'Évitez les paiements anticipés.',
    ],
    contactActions: ['whatsapp', 'sms', 'call'],
  },
];

@Injectable()
export class ListingsService {
  listBrowseFeed() {
    return {
      items: listingFixtures.map((listing) => ({
        categoryLabel: listing.categoryLabel,
        locationLabel: listing.locationLabel,
        priceCdf: listing.priceCdf,
        slug: listing.slug,
        title: listing.title,
      })),
    };
  }

  getListingDetail(slug: string) {
    const listing = listingFixtures.find((entry) => entry.slug === slug);

    if (!listing) {
      throw new NotFoundException('Annonce introuvable.');
    }

    return listing;
  }
}
