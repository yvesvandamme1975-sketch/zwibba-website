# Zwibba Buyer UI Hierarchy Design

**Date:** 2026-09-09

## Goal

Permettre de trouver une annonce et de contacter son vendeur rapidement, sur mobile comme sur ordinateur. Le contenu principal d'Acheter est l'annonce ; celui de Vendre est la prise de photo. Belgique et RDC ont la meme priorite.

Statut : plan relu par `gpt-6-astra` le 9 septembre 2026, depuis le code local `d7d3802`. Les corrections de sa revue sont integrees ci-dessous. Ce document decrit des changements a realiser ; il ne constitue pas une preuve de livraison.

## Problem

1. Le diagnostic initial confondait deux ecrans. Les captures montrent Vendre actif. `renderBuyScreen` ne contient deja aucun bloc photo ; `renderHomeScreen`, utilise par `#sell`, `#home` et la route par defaut, le contient. Supprimer un bloc inexistant dans Acheter ne resoudrait pas une mauvaise destination ou une ancienne version affichee.
2. La fiche place description, vendeur, formulaire d'avis et conseils avant les actions de contact. L'effort demande pour donner un avis concurrence l'intention de contacter le vendeur.
3. Recherche et categorie sont les seuls filtres. Un budget sans devise pourrait comparer incorrectement EUR, USD et CDF ; une zone sans contrat precis pourrait promettre une recherche geographique inexistante.
4. Plusieurs halos et aplats verts donnent une importance similaire a la navigation, aux categories, aux panneaux et aux boutons. Le champ de recherche a un conteneur et un champ visuellement redondants ; sa loupe est dessinee par deux pseudo-elements separes par l'input.
5. Les photos des cartes n'ont pas de ratio fixe. Le correctif des categories stabilise les boutons, mais ne resout pas a lui seul l'etirement des autres lignes de grille sur une page courte.
6. Le rendu preserve certaines positions lors d'un rerendu de la meme route, mais ne memorise pas explicitement la position du catalogue pendant un aller-retour vers une fiche. Le formulaire de filtres doit aussi survivre aux autres rafraichissements.

## Non-Goals

- Regrouper, supprimer ou masquer les categories sous un bouton Plus : refuse par Yves.
- Reconcevoir les etats vides ou leur texte : refuse par Yves. Les nouveaux filtres auront leurs propres commandes d'effacement, hors de cet etat.
- Employer Stitch, changer de framework ou refaire la vitrine.
- Ajouter un checkout ou un bouton Acheter qui promettrait une transaction. Le parcours existant aboutit au contact ; son bouton principal reste « Envoyer un message ».
- Changer implicitement l'accueil par defaut, l'ordre des cinq onglets, le choix de marche selon la session, les regles d'authentification, les droits de contact ou d'avis.
- Geolocaliser, promettre un rayon en kilometres, convertir les devises, ajouter une pagination ou de nouvelles API dans ce lot.

## Existing System

| Surface | Implementation verifiee |
| --- | --- |
| Routage | `App/features/home/buyer-browse-controller.mjs` : `#buy` donne `buy`, `#home` et route absente/inconnue donnent `sell`. `App/app.js` appelle les deux renderers distincts. |
| Catalogue | `App/features/home/buy-screen.mjs` : marque, choix BE/CD pour visiteur, recherche, toutes les categories, En avant, Recent. Aucun bloc photo. |
| Donnees | `App/services/listings-service.mjs` appelle `GET /listings?countryCode=...`. `apps/api/src/listings/listings.service.ts` renvoie actuellement tout le flux public du pays, sans pagination. |
| Prix et zone | Le resume expose `priceAmount`, `priceCurrency`, `priceCdf`, `countryCode`, `locationLabel`. `locationLabel` provient de `listing.area` ; le resume ne fournit ni coordonnees ni identifiant de ville. |
| Contrat prix | `apps/api/src/common/price-validation.ts` accepte des entiers de 0 a 2147483647. `priceCdf` est aussi un champ historique qui peut contenir le montant natif d'une annonce USD/EUR : ce n'est pas un taux de conversion. |
| Sections | `getHomeSections()` place les deux premiers resultats dans En avant, le reste dans Recent. Cela ne prouve pas qu'ils ont un boost payant. |
| Fiche | `App/features/listings/listing-detail-screen.mjs` : titre/zone/prix, galerie, description, attributs, vendeur/note, formulaire d'avis, securite, contact ou gestion proprietaire. |
| Avis | `App/utils/rating-stars.mjs` fournit moyenne et nombre ; la liste des avis est sur le profil public vendeur. La fiche n'a pas de collection d'avis textuels a previsualiser. |
| Stabilite | `buyer-search-render-state.mjs`, `buyer-category-scroll-render-state.mjs`, `scroll-render-state.mjs` restaurent focus/selection ou defilement selon le contexte. `renderApp()` remplace encore le DOM de l'app. |
| Style | Tokens reels dans `src/site/styles.css`, consommes par `App/app.css`. Les marges de 112 px et CTA blancs du skill sont des exemples de landing, inappropries pour cette PWA dense. |

## Recommended Architecture

### 1. Clarifier les destinations avant de retirer des elements

Tester le clic Acheter, l'URL directe `#buy`, le retour d'une fiche ouverte depuis Acheter et la restauration d'une session sur cette route. Tous doivent rendre Acheter actif et zero bloc photo. Les autres retours retrouvent leur origine reelle selon la section 4. Vendre conserve l'entree de prise de photo et le brouillon ; il ne s'agit pas d'ajouter une nouvelle image decorative au panneau vendeur. Une entree explicitement libellee Acheter doit viser `#buy` ; une entree generique dans l'application conserve sa destination actuelle.

Si la production montre le bloc photo avec Acheter actif, relever URL, onglet actif, SHA/version des assets et comportement du service worker avant toute correction. Ne pas attribuer une cause au cache sans reproduction. Les captures seules ne demontrent pas ce probleme.

### 2. Faire apparaitre les annonces rapidement

Ordre sur Acheter : marque et marche compacts, recherche, commande « Prix et zone », categories, annonces. La commande de filtres est fermee initialement, accessible en une action et accompagnee d'un nombre de familles actives. Aucun texte explicatif ni panneau promotionnel supplementaire.

La recherche devient un seul champ avec une icone Lucide Search et un libelle accessible propre a l'input. Le nouveau code reste en ESM natif ; si aucun adaptateur Lucide n'existe, ajouter explicitement un module local limite aux icones necessaires, sans React, script CDN ou dependance de framework.

Les categories gardent ordre, libelles et defilement horizontal. Boutons de 44 px au zoom normal, hauteur identique pour selection active, chargement, liste pleine et liste vide. Au zoom texte, laisser grandir la hauteur de facon coherente pour ne pas couper les libelles. Ajouter `aria-pressed` aux boutons et `aria-current="page"` a l'onglet actif.

Aligner les lignes du catalogue en haut, sans distribution verticale du vide. Cartes avec media au ratio 4:3, titre limite a deux lignes, prix et zone visibles ; le titre complet reste accessible sur la fiche et par le nom du lien. La galerie de fiche utilise `object-fit: contain` pour inspecter l'objet entier. Garder les assets reels existants. Ne pas transformer toutes les sections en cartes.

### 3. Donner un contrat simple aux filtres

Un volet integre a la page, ouvert par un `<details>`/`<summary>` natif, contient zone, prix minimum, prix maximum et devise. Sur mobile les champs peuvent se disposer sur plusieurs lignes ; sur desktop ils tiennent sur une rangee lorsque la place le permet. Pas de nouveau modal a gerer.

Deux jeux de valeurs sont explicites : le controleur possede les filtres appliques ; l'etat de vue possede valeurs brutes, ouverture et erreurs du formulaire. Les deux portent le contexte du pays courant. Saisir ne rerend pas la page et ne ferme pas le clavier. « Appliquer » valide puis filtre ; « Annuler » (bouton type=button) revient aux valeurs appliquees ; fermer le volet sans appliquer abandonne le brouillon. Observer le `toggle` natif directement ou en capture et distinguer fermeture utilisateur et restauration programmatique. Une capture de l'ancien pays ne peut pas ecraser la remise a zero du nouveau contexte. Les erreurs restent pres du champ avec focus et association ARIA. Une action « Effacer prix et zone » reste accessible volet ferme lorsqu'un filtre est actif ; elle ne touche ni recherche ni categorie. Le compteur des familles actives vaut 0, 1 ou 2 : budget/devise compte pour une famille, zone pour une autre ; EUR implicite en Belgique ne compte pas.

Regles de filtrage, combinees par ET avec recherche/categorie :

- Zone : select « Toutes les zones » puis les valeurs non vides et dedupliquees de `locationLabel` du flux du pays, triees en francais. Construire cette liste depuis tout le flux, avant les autres filtres, afin qu'une option selectionnee ne disparaisse pas. Egalite normalisee via `normalizeLocationValueForMatch`, pas de correspondance floue sur une ville supposee. Une zone sans libelle reste visible sans filtre, et est exclue si une zone est choisie.
- Prix : bornes inclusives ; vide = aucune borne, zero = vrai montant zero. Autoriser les espaces de groupement, rejeter signes negatifs, decimales, lettres, exponentielles et valeurs hors contrat. Ne pas reutiliser aveuglement `parsePriceInput`, qui retire les caracteres non chiffres. Une saisie `12,50` ne doit pas devenir `1250`.
- Belgique : EUR indique explicitement pres des champs ; sans borne, aucun filtrage supplementaire n'est active.
- RDC : « Toutes devises », CDF ou USD. Au moins une borne exige de choisir CDF ou USD ; selectionner une devise seule est un filtre valide. Comparer seulement le montant natif dans cette devise, sans convertir ni comparer a `priceCdf` comme s'il s'agissait d'un equivalent CDF.
- Priorite au couple `priceAmount`/`priceCurrency` ; le repli historique vers `priceCdf` n'est admis que pour une annonce CDF dont la devise est absente ou CDF. Un prix inconnu reste visible sans filtre de prix mais ne passe pas une borne active.
- Changement de pays : effacer zone/budget/devise et brouillon devenus incompatibles, conserver recherche/categorie. Afficher le nouveau contexte et la synthese mise a jour. Ne pas montrer les resultats d'un ancien pays comme s'ils etaient ceux du nouveau.

La synthese compacte indique les filtres reellement appliques et le nombre total de resultats avant la repartition En avant/Recent. Aucun comptage de vues ou autre evenement analytique nouveau. Ne pas journaliser la saisie brute de zone/budget.

Le filtrage local reutilise le flux exhaustif actuel. Si sa reponse devient paginee, un filtrage local ne suffit plus : revoir le contrat serveur avant de livrer cette evolution.

### 4. Conserver le contexte de navigation

Memoriser en memoire de la session navigateur l'origine reelle et le contexte de navigation : Acheter, Vendre, profil personnel ou profil public vendeur. Capturer le DOM sortant sous `lastRenderedRouteKey`, jamais sous le nouveau hash ; conserver cette origine pendant chargement, erreur, partage et authentification. Le retour depuis une fiche ou le bouton Retour du navigateur restitue l'ecran d'origine, son defilement vertical, celui des categories et le focus sur la carte ou le bouton « Voir » encore present. Si l'element a disparu, replacer le focus sur le titre de sa liste. Une entree directe sans origine utilise Acheter comme repli.

Conserver aussi la chaine catalogue -> fiche -> profil vendeur/avis : le retour interne du profil vendeur mene a la fiche, puis le retour fiche mene au catalogue initial. Faire passer un contexte de retour explicite aux renderers de fiche et de profil public, y compris leurs etats loading/error. Ne pas ajouter un second routeur ni changer les hash existants. Les routes d'authentification ne deviennent pas des destinations de retour de lecture.

Preserver aussi les filtres appliques, le texte de recherche et sa selection. Les filtres prix/zone restent propres a Acheter pour ne pas filtrer invisiblement le flux vendeur partage. Un clic sur l'onglet deja actif conserve l'intention existante de remonter en haut ; le lien de retour depuis une fiche restaure la position. Ne pas persister ces nouvelles donnees en localStorage.

Le badge de messages peut evoluer sans remplacer la page, fermer un volet ou perdre un brouillon. Pas de nouveau timer de rafraichissement global.

### 5. Mettre le contact avant les avis

Sur mobile, ordre logique du DOM : retour/partage discret, titre, prix et zone, galerie compacte, actions de contact, description et attributs, vendeur et resume d'avis, action secondaire pour donner un avis, conseils de securite. La securite reste lisible et accessible ; pas de nouveau message legal.

Le CTA principal « Envoyer un message » est situe avant les avis et la description longue. WhatsApp et Appeler restent secondaires selon `contactActions` et les coordonnees existantes ; Partager reste une action utilitaire. Preserver le controle d'acces existant et le retour vers la fiche apres authentification. Ne jamais ajouter de bouton de contact au proprietaire pour sa propre annonce.

Pour ce premier lot, placer le contact dans le flux, sans une deuxieme barre fixe au-dessus des cinq onglets. C'est le compromis recommande : moins de recouvrement et de hauteur reservee, comportement de clavier plus simple. Dimensionner la galerie mobile pour voir le debut du bloc de contact sur une fenetre 390x844 avec un titre de deux lignes, une fois le contenu charge. Les grands titres ou le zoom ont priorite sur cette cible.

Sur desktop large (>=1024 px), galerie a gauche, titre/prix/zone/actions a droite dans une mise en page non encadree ; description et contenu vendeur sous cette zone. Conserver le meme ordre de lecture pertinent au clavier et au lecteur d'ecran. Sous ce seuil, une colonne.

L'apercu d'avis signifie vendeur + note + nombre d'avis, avec acces a son profil public. Ne pas inventer d'extraits indisponibles dans le payload, d'achat verifie ou de vente confirmee. « Pas encore d'avis » reste neutre, sans simuler une mauvaise note ni une verification. Le formulaire « Donner un avis » est replie par defaut sous le contact, ouvert par une action explicite. Son bouton d'envoi devient secondaire. Le contexte vendeur n'est pas un bloc vert « verifie » lorsque les donnees ne justifient pas cette qualification.

Un etat d'avis en memoire, indexe par annonce, conserve note, commentaire, ouverture et statut pendant changement de miniature, partage, rerendu et authentification reprise sur cette fiche. Une erreur conserve la saisie ; seul un succes confirme efface le brouillon et affiche une confirmation. Ne pas transferer les valeurs a une autre annonce ; vider cet etat a la deconnexion ou changement d'identite hors de la reprise d'auth prevue. Pendant l'envoi, desactiver le submit et bloquer les doubles requetes.

La revue statique a identifie un risque existant a reproduire : le listener de clic global remonte au formulaire `data-action="submit-review"`, puis appelle `preventDefault()` meme quand le bouton n'a pas d'action de clic. Cela peut annuler son submit natif. Corriger la delegation pour ne consommer que les actions de clic gerees, tout en preservant le listener submit. Placer le details autour du formulaire et son summary hors du formulaire porteur de l'action ; tester ouverture et envoi par clic reel.

### 6. Reduire les effets et respecter l'accessibilite

Appliquer les tokens existants aux fonds et bordures. Retirer les halos decoratifs de la coque, des categories et de la zone acheteur ; conserver une surface lisible et un focus visible. Le vert identifie l'action principale et les selections, pas les grandes surfaces de contenu. Ne pas modifier globalement les tokens de la vitrine.

Verifier contraste des textes ordinaires >=4,5:1, gros textes >=3:1, controles et focus >=3:1. Libelles explicites, champs accessibles, cibles tactiles >=44 px, selection autrement que par la couleur, aucun debordement a 320 px. Lighthouse accessibilite vise 100 sur les ecrans modifies ; cela complete, sans remplacer, la recette clavier et lecteur d'ecran.

### 7. Recette et limites de preuve

| Scenario | Critere de recette |
| --- | --- |
| Entree Acheter | Clic onglet, lien direct et retour d'une fiche issue d'Acheter : Acheter actif, aucun bloc photo, aucun passage impose par capture/auth pour consulter le flux. |
| Premier ecran | A 390x844 et 1440x900, avec donnees de test pretes et filtres fermes, une premiere carte montre photo, titre, prix et zone avant de scroller ; pas de titre tronque horizontalement a 320 px. |
| Categories | Hauteur identique a +/-1 px au zoom normal en plein/vide/chargement, y compris longs libelles ; toute categorie reste accessible tactile/clavier. |
| Filtres | Combinaisons ET correctes ; 0 distinct de vide ; bornes inclusives ; min > max bloque ; USD/CDF jamais compares ; prix illisible jamais transforme silencieusement. |
| Contexte | Retour d'une fiche : origine, recherche/filtres/category scroll inchanges, position a +/-2 px avec les memes donnees, focus sur carte/commande Voir ; tester aussi fiche -> profil vendeur -> fiche -> catalogue et profil personnel -> fiche -> profil. Pays change volet ouvert : ancien brouillon invalide, meme apres reponse reseau retardee. |
| Avis/contact | Un seul CTA principal de contact ; actions avant avis dans le DOM ; a 390x844, titre deux lignes et galerie chargee, haut du bouton principal visible au-dessus de la nav, bouton accessible entier par scroll. Formulaire ferme initialement ; ouverture et submit par vrais clics/clavier ; vue proprietaire sans auto-contact. |
| Brouillon | Avis saisi -> miniature -> partage -> retour -> envoi lent/echoue : valeurs conservees et une seule requete. Filtres non appliques -> changement de categorie/rerendu : volet, saisie et focus pertinent conserves ; fermer puis rouvrir abandonne les valeurs non appliquees. |
| Confort | Saisie et clavier stables, aucun chevauchement nav/CTA, aucun remplacement du contenu apres 65 secondes d'inactivite dues au compteur messages. Cette garde ne remplace pas les scenarios de rerendu du brouillon. |
| Responsive | Chromium et WebKit a 320, 390, 768, 1024 et 1440 px ; zoom 200 % et reflow equivalent 400 %, images chargees, aucune erreur JS. Au zoom, priorite aux libelles et controles complets plutot qu'a la cible premier ecran. |
| Production | SHA/deploiement verifies pour les services affectes, HTTP 200 et smoke du parcours. Tests ecrivant avis/messages seulement avec fixtures locales ou comptes de test explicitement isoles. |

Playwright Chromium/WebKit et profils mobiles constituent une emulation, pas une recette sur appareils physiques. iPhone Safari et Android Chrome reels restent a consigner avec modele, version navigateur et resultat ; ne jamais les marquer passes sans execution.

## Review Decisions

Les choix produit de Yves priment sur les recommandations generiques du skill. Trois approches ont ete considerees : retouche CSS seule (insuffisante pour les filtres/avis), hierarchie et interactions ciblees (retenue), refonte de navigation et barre de contact fixe (reportee). Les points refuses, les regles de marche/auth et la destination generique de l'app restent explicites dans les non-objectifs.

Revue independante : `gpt-6-astra`, effort high, agent `01a0854f-6120-7342-8169-266e2d44aab5`, deux passes (cadrage/code puis lecture des deux documents). Corrections integrees : contrat des devises ; separation modele/brouillon par pays ; origine de navigation ; conservation des avis ; soumission par clic natif ; cible geometrique du contact ; vrai rerendu pendant saisie. Il s'agit d'une revue statique, pas d'une recette navigateur.

Decision ouverte hors de ce lot : permettre a un compte connecte de choisir le marche consulte independamment du pays de son numero. Astra le recommande pour faciliter la navigation BE/RDC ; cela change un comportement produit existant et doit faire l'objet d'un cadrage distinct. Le plan ne change pas les regles du compte en silence.

Les exemples de grandes marges et CTA blancs du skill ne sont pas transposes a la PWA. Une suggestion d'ajouter une nouvelle photo dans le panneau vendeur n'est pas retenue : l'intention validee concerne le parcours de prise de photo, pas un nouvel asset. Le contact apres galerie compacte est conserve pour montrer l'objet avant l'action, avec mesure explicite de sa visibilite.

Verification de base executee le 9 septembre : 60 tests existants PASS (`app-buyer-routing`, `app-buyer-home`, `listing-detail-screen`, `app-shell-ui`). Verification documentaire : neuf taches a trois etapes, chemins Modify existants, paire indexee et `git diff --check` propre. Aucun changement de fonctionnalite ni deploiement effectue par cette relecture.
