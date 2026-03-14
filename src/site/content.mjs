export const site = {
  name: 'Zwibba',
  tagline: 'Vendez en un clic',
  secondaryTagline: 'Sell it in a snap',
  baseUrl: 'https://zwibba.com',
  locale: 'fr_CD',
  description:
    "Zwibba est la place de marché pensée pour le mobile à Lubumbashi. Prenez une photo, laissez l'IA préparer votre annonce, puis publiez en quelques secondes.",
  market: 'Lubumbashi, RDC',
  phonePrefix: '+243',
  nav: [
    { href: '/', label: 'Accueil' },
    { href: '/annonces/', label: 'Annonces' },
    { href: '/ambassadeur/', label: 'Ambassadeur' },
    { href: '/a-propos/', label: 'À propos' },
    { href: '/contact/', label: 'Contact' },
  ],
  stores: [
    {
      label: 'Google Play',
      href: 'https://play.google.com/store/apps/details?id=com.zwibba.app',
      eyebrow: 'Android',
      note: 'Télécharger sur Google Play',
    },
    {
      label: 'Huawei AppGallery',
      href: 'https://appgallery.huawei.com/',
      eyebrow: 'Huawei',
      note: 'Télécharger sur AppGallery',
    },
  ],
  supportEmail: 'support@zwibba.com',
  supportMailSubject: 'Support Zwibba',
  socialProof: [
    { value: '< 60s', label: 'pour publier avec photo + IA' },
    { value: '10', label: 'catégories clés pour Lubumbashi' },
    { value: '2G/3G', label: 'expérience pensée pour les connexions lentes' },
  ],
};

export const categories = [
  { slug: 'real_estate', label: 'Immobilier', icon: 'Maison', hint: 'Maisons, appartements, terrains, bureaux.' },
  { slug: 'vehicles', label: 'Véhicules', icon: 'Route', hint: 'Voitures, motos, camions, pièces détachées.' },
  { slug: 'food', label: 'Alimentation', icon: 'Panier', hint: 'Fruits, boissons, produits locaux, surgelés.' },
  { slug: 'agriculture', label: 'Agriculture', icon: 'Feuille', hint: 'Semences, bétail, équipements, engrais.' },
  { slug: 'phones_tablets', label: 'Téléphones & Tablettes', icon: 'Mobile', hint: 'Smartphones, tablettes, accessoires.' },
  { slug: 'electronics', label: 'Électronique', icon: 'Eclair', hint: 'TV, ordinateurs, consoles, audio.' },
  { slug: 'fashion', label: 'Mode & Beauté', icon: 'Etoile', hint: 'Vêtements, bijoux, chaussures, cosmétiques.' },
  { slug: 'home_garden', label: 'Maison & Jardin', icon: 'Canape', hint: 'Meubles, électroménager, déco, bricolage.' },
  { slug: 'jobs_services', label: 'Emplois & Services', icon: 'Briefcase', hint: 'Cours, HORECA, mécanique, santé, services.' },
  { slug: 'sports_leisure', label: 'Sports & Loisirs', icon: 'Ballon', hint: 'Fitness, vélos, musique, livres.' },
];

export const featureSteps = [
  {
    step: '01',
    title: 'Prenez une photo',
    copy: "Votre téléphone fait le travail. Prenez 1 à 5 photos et Zwibba lance l'annonce pour vous.",
  },
  {
    step: '02',
    title: "L'IA remplit le brouillon",
    copy: 'Titre, catégorie, état, description et prix en CDF sont proposés automatiquement.',
  },
  {
    step: '03',
    title: 'Publiez et partagez',
    copy: 'Ajustez le prix, confirmez le lieu, puis partagez votre annonce sur WhatsApp en quelques secondes.',
  },
];

export const platformHighlights = [
  {
    title: 'Conçu pour Lubumbashi',
    copy: 'Filtres par quartier, prix en CDF et catégories utiles pour le marché local.',
  },
  {
    title: "Paiement mobile d'abord",
    copy: 'M-Pesa, Airtel Money et Orange Money servent pour les options payantes et la mise en avant.',
  },
  {
    title: 'Accès protégé',
    copy: "Le site montre les annonces. L'application sert à publier, enregistrer et contacter.",
  },
  {
    title: 'Léger sur 3G',
    copy: 'Des images légères et peu de chargement pour ouvrir vite, même sur un réseau lent.',
  },
];

export const testimonials = [
  {
    quote:
      "J'avais l'habitude de poster dans plusieurs groupes Facebook. Ici, je prends une photo et l'annonce est déjà presque prête.",
    name: 'Marie K.',
    role: 'Vendeuse occasionnelle, Kenya',
  },
  {
    quote:
      "Pour un magasin de téléphones, la vitesse compte. Zwibba me donne une vitrine simple avec des annonces claires et un suivi facile.",
    name: 'Patrick M.',
    role: 'Vendeur pro, Lubumbashi Centre',
  },
  {
    quote:
      "Je veux des détails clairs avant de me déplacer. Les fiches Zwibba sont simples, et je peux ensuite ouvrir l'application pour continuer.",
    name: 'Jean L.',
    role: 'Acheteur, Golf Plateau',
  },
];

export const faqs = [
  {
    question: 'Est-ce que Zwibba est déjà disponible dans tout le Congo ?',
    answer: 'Le lancement commence à Lubumbashi, avec une extension progressive vers les autres villes du Congo.',
  },
  {
    question: "Pourquoi faut-il l'application pour contacter un vendeur ?",
    answer: "Le site sert à découvrir et à partager les annonces. L'application gère les favoris, les messages et le contact en sécurité.",
  },
  {
    question: "Puis-je vendre des services et pas seulement des produits ?",
    answer: 'Oui. Zwibba gère les annonces de produit, de location et de service, avec des champs adaptés à chaque besoin.',
  },
  {
    question: 'Comment fonctionne le programme ambassadeur ?',
    answer: "Chaque groupe de 10 parrainages validés débloque un avantage. Le suivi et les récompenses se font dans l'application.",
  },
];

export const aboutValues = [
  {
    title: 'Simplicité radicale',
    copy: "Chaque écran doit faire gagner du temps. Si une grand-mère de Lubumbashi ne peut pas publier en moins d'une minute, on recommence.",
  },
  {
    title: 'Confiance pragmatique',
    copy: 'Vérification du numéro, conseils de sécurité et partage simple : la confiance se construit à chaque étape.',
  },
  {
    title: 'IA qui aide vraiment',
    copy: "L'IA n'est pas là pour faire joli. Elle remplit les champs utiles, organise l'annonce et aide à trouver un bon prix.",
  },
];

export const supportTopics = [
  {
    title: 'Support lancement',
    copy: 'Questions sur le démarrage, les stores, les badges ou la disponibilité par ville.',
    cta: 'Écrire au support',
  },
  {
    title: 'Partenariats',
    copy: 'Médias, influence, boutiques pro ou actions locales pour faire connaître Zwibba.',
    cta: 'Parler partenariat',
  },
  {
    title: 'Retour produit',
    copy: 'Suggestions sur le parcours, la confiance, les catégories ou les performances sur réseau lent.',
    cta: 'Envoyer un retour',
  },
];

export const ambassadorChannels = [
  { name: 'WhatsApp', copy: 'Le canal prioritaire pour partager un lien simple et convaincre vite.' },
  { name: 'Facebook', copy: 'Pour toucher les groupes locaux et les vendeurs déjà présents sur les réseaux.' },
  { name: 'Instagram', copy: 'Pour les vendeurs mode, beauté et petit commerce.' },
  { name: 'TikTok', copy: 'Pour faire connaître un produit avec une vidéo simple et rapide.' },
];

export const listings = [
  {
    slug: 'samsung-galaxy-a54-neuf-lubumbashi',
    title: 'Samsung Galaxy A54 neuf sous emballage',
    category: 'phones_tablets',
    categoryLabel: 'Téléphones & Tablettes',
    icon: 'Mobile',
    priceCdf: 450000,
    condition: 'Neuf',
    city: 'Lubumbashi',
    neighborhood: 'Bel Air',
    listingType: 'Produit',
    transactionType: 'Vente',
    isFeatured: true,
    publishedAt: 'Il y a 18 min',
    seller: {
      name: 'Patrick Mobile',
      role: 'Vendeur pro',
      memberSince: 'Membre depuis 2024',
      listings: '42 annonces actives',
      responseTime: 'Répond en moyenne en 9 min',
    },
    summary:
      'Smartphone Samsung garanti, 128 Go, avec câble et coque transparente. Idéal pour démarrer vite.',
    description: [
      "Téléphone encore scellé, version 128 Go, finition graphite. C'est le type d'annonce que Zwibba doit aider à publier en moins d'une minute.",
      "Le vendeur propose une remise en main propre à Bel Air et peut montrer le produit sur place. Le détail complet s'ouvre dans l'application pour garder le contact en sécurité.",
    ],
    specs: [
      ['Stockage', '128 Go'],
      ['Couleur', 'Graphite'],
      ['Garantie', '7 jours vendeur'],
      ['Livraison', 'Remise en main propre'],
    ],
    accent: ['#6BE66B', '#163824'],
  },
  {
    slug: 'appartement-2-chambres-quartier-industriel',
    title: 'Appartement 2 chambres quartier Industriel',
    category: 'real_estate',
    categoryLabel: 'Immobilier',
    icon: 'Maison',
    priceCdf: 1200000,
    condition: 'Bon état',
    city: 'Lubumbashi',
    neighborhood: 'Quartier Industriel',
    listingType: 'Produit',
    transactionType: 'Location',
    isFeatured: true,
    publishedAt: 'Il y a 31 min',
    seller: {
      name: 'Nadine Habitat',
      role: 'Particulier',
      memberSince: 'Membre depuis 2025',
      listings: '6 annonces actives',
      responseTime: 'Répond en moyenne en 14 min',
    },
    summary:
      'Appartement lumineux avec eau et sécurité, proche des grands axes. Idéal pour un couple ou une colocation.',
    description: [
      'Deux chambres, salon, cuisine et petite cour. Le quartier permet de rejoindre facilement le centre et les zones commerciales de Lubumbashi.',
      "Zwibba montre les informations utiles sur le site, puis renvoie vers l'application pour le contact et les favoris.",
    ],
    specs: [
      ['Type', 'Location mensuelle'],
      ['Pièces', '2 chambres + salon'],
      ['Quartier', 'Q. Industriel'],
      ['Disponibilité', 'Immédiate'],
    ],
    accent: ['#F4B65F', '#3A2610'],
  },
  {
    slug: 'toyota-hilux-2019-4x4',
    title: 'Toyota Hilux 2019 diesel 4x4',
    category: 'vehicles',
    categoryLabel: 'Véhicules',
    icon: 'Route',
    priceCdf: 45000000,
    condition: 'Très bon état',
    city: 'Lubumbashi',
    neighborhood: 'Golf Plateau',
    listingType: 'Produit',
    transactionType: 'Vente',
    isFeatured: false,
    publishedAt: 'Il y a 1 h',
    seller: {
      name: 'Garage Plateau',
      role: 'Vendeur pro',
      memberSince: 'Membre depuis 2023',
      listings: '19 annonces actives',
      responseTime: 'Répond en moyenne en 22 min',
    },
    summary:
      "Pick-up 4x4 solide pour la ville et le terrain. Historique d'entretien disponible pendant la visite.",
    description: [
      "Modèle 2019, moteur diesel, double cabine. Cette fiche donne les points clés avant d'ouvrir l'application et de contacter le vendeur.",
      "Le vendeur peut ensuite partager plus de photos et l'historique d'entretien dans l'application.",
    ],
    specs: [
      ['Transmission', 'Manuelle'],
      ['Carburant', 'Diesel'],
      ['Kilométrage', '89 000 km'],
      ['Traction', '4x4'],
    ],
    accent: ['#F08A5D', '#341A10'],
  },
  {
    slug: 'service-plomberie-urgence-7j7',
    title: 'Service plomberie urgence 7j/7',
    category: 'jobs_services',
    categoryLabel: 'Emplois & Services',
    icon: 'Briefcase',
    priceCdf: 25000,
    condition: 'Service',
    city: 'Lubumbashi',
    neighborhood: 'Centre-ville',
    listingType: 'Service',
    transactionType: 'Service',
    isFeatured: false,
    publishedAt: 'Il y a 1 h 12',
    seller: {
      name: 'Mika Services',
      role: 'Prestataire',
      memberSince: 'Membre depuis 2024',
      listings: '11 annonces actives',
      responseTime: 'Répond en moyenne en 11 min',
    },
    summary:
      'Intervention rapide sur fuites, installations et dépannages courants. Disponible en semaine et le samedi.',
    description: [
      "Exemple direct du modèle service prévu dans le plan. L'annonce met en avant la zone couverte, les horaires et le prix plutôt qu'un état produit.",
      "Le détail complet s'ouvre dans l'application pour garder les échanges au même endroit.",
    ],
    specs: [
      ['Zone de service', 'Lubumbashi Centre'],
      ['Disponibilité', 'Lun-Sam 8h-18h'],
      ['Tarif', 'À partir de 25 000 CDF'],
      ['Expérience', '5 ans'],
    ],
    accent: ['#68C3D4', '#102C34'],
  },
  {
    slug: 'canape-3-places-style-contemporain',
    title: 'Canapé 3 places style contemporain',
    category: 'home_garden',
    categoryLabel: 'Maison & Jardin',
    icon: 'Canape',
    priceCdf: 380000,
    condition: 'Bon état',
    city: 'Lubumbashi',
    neighborhood: 'Kampemba',
    listingType: 'Produit',
    transactionType: 'Vente',
    isFeatured: false,
    publishedAt: 'Il y a 2 h',
    seller: {
      name: 'Maison Clara',
      role: 'Particulier',
      memberSince: 'Membre depuis 2025',
      listings: '5 annonces actives',
      responseTime: 'Répond en moyenne en 18 min',
    },
    summary:
      'Canapé confortable avec assise profonde, tissu gris et structure stable. Idéal pour un salon moderne.',
    description: [
      "Le site met l'annonce en valeur avec des sections courtes, puis l'application prend la suite pour les favoris et le contact.",
      "Le retrait est prévu à Kampemba. D'autres photos peuvent être envoyées après ouverture dans l'application.",
    ],
    specs: [
      ['Matière', 'Tissu gris'],
      ['Places', '3'],
      ['Livraison', 'Retrait à Kampemba'],
      ['État', 'Bon état'],
    ],
    accent: ['#B5A8D5', '#2A1D36'],
  },
  {
    slug: 'robe-wax-africaine-taille-m',
    title: 'Robe wax africaine taille M',
    category: 'fashion',
    categoryLabel: 'Mode & Beauté',
    icon: 'Etoile',
    priceCdf: 15000,
    condition: 'Très bon état',
    city: 'Lubumbashi',
    neighborhood: 'Kenya',
    listingType: 'Produit',
    transactionType: 'Vente',
    isFeatured: false,
    publishedAt: 'Il y a 2 h 45',
    seller: {
      name: 'Atelier Mado',
      role: 'Vendeur pro',
      memberSince: 'Membre depuis 2024',
      listings: '27 annonces actives',
      responseTime: 'Répond en moyenne en 7 min',
    },
    summary:
      'Pièce colorée avec coupe simple, idéale pour tous les jours ou pour un événement. Retouche possible sur demande.',
    description: [
      "Annonce idéale pour la catégorie Mode & Beauté. Le prix en CDF est visible tout de suite et le parcours de contact reste simple.",
      "Le vendeur peut aussi proposer d'autres tailles dans l'application.",
    ],
    specs: [
      ['Taille', 'M'],
      ['Tissu', 'Wax'],
      ['Retouche', 'Possible'],
      ['Quartier', 'Kenya'],
    ],
    accent: ['#D86C8A', '#34111E'],
  },
  {
    slug: 'ordinateur-portable-hp-elitebook',
    title: 'Ordinateur portable HP EliteBook',
    category: 'electronics',
    categoryLabel: 'Électronique',
    icon: 'Eclair',
    priceCdf: 690000,
    condition: 'Bon état',
    city: 'Lubumbashi',
    neighborhood: 'Ruashi',
    listingType: 'Produit',
    transactionType: 'Vente',
    isFeatured: true,
    publishedAt: 'Il y a 3 h',
    seller: {
      name: 'Informatique Ruashi',
      role: 'Vendeur pro',
      memberSince: 'Membre depuis 2023',
      listings: '13 annonces actives',
      responseTime: 'Répond en moyenne en 16 min',
    },
    summary:
      'Portable professionnel reconditionné, SSD rapide, batterie correcte. Convient aux étudiants et au travail de bureau.',
    description: [
      'Clavier propre, châssis en bon état, démarrage rapide. La fiche doit rester claire, simple à partager et facile à trouver sur le web.',
      "Le vendeur peut ensuite partager une vidéo de démonstration dans l'application.",
    ],
    specs: [
      ['Modèle', 'HP EliteBook'],
      ['Mémoire', '8 Go RAM'],
      ['Stockage', '256 Go SSD'],
      ['Usage', 'Bureau / Études'],
    ],
    accent: ['#7BDCB5', '#113225'],
  },
  {
    slug: 'mangues-et-avocats-frais-du-haut-katanga',
    title: 'Mangues et avocats frais du Haut-Katanga',
    category: 'food',
    categoryLabel: 'Alimentation',
    icon: 'Panier',
    priceCdf: 12000,
    condition: 'Frais',
    city: 'Lubumbashi',
    neighborhood: 'Marché Kenya',
    listingType: 'Produit',
    transactionType: 'Vente',
    isFeatured: false,
    publishedAt: 'Il y a 4 h',
    seller: {
      name: 'Marché Frais',
      role: 'Particulier',
      memberSince: 'Membre depuis 2025',
      listings: '4 annonces actives',
      responseTime: 'Répond en moyenne en 12 min',
    },
    summary:
      'Lot de fruits frais. Adapté aux achats de proximité et aux catégories du quotidien.',
    description: [
      "Le plan Zwibba prévoit aussi les catégories du quotidien. Ce type d'annonce montre que la plateforme ne se limite pas aux téléphones et à l'électronique.",
      'Le vendeur précise les jours de disponibilité et le point de retrait sur le marché.',
    ],
    specs: [
      ['Produit', 'Mangues + avocats'],
      ['Origine', 'Haut-Katanga'],
      ['Vente', 'Par lot'],
      ['Retrait', 'Marché Kenya'],
    ],
    accent: ['#E7C35E', '#3A2B0D'],
  },
];
