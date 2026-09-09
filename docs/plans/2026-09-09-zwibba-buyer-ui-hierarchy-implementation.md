> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

# Zwibba Buyer UI Hierarchy Implementation Plan

**Goal:** Rendre Zwibba identifiable dans une topbar stable, les annonces et le contact prioritaires, ajouter prix/zone avec devises explicites et presenter les avis en apercu secondaire.

**Architecture:** Conserver les renderers ESM purs et le flux public actuel. Ajouter des filtres acheteur purs, un petit composant de formulaire et un etat de retour au catalogue ; raccorder les interactions dans `App/app.js`. La fiche change de hierarchie sans modifier les API de contact ou d'avis. Reutiliser les tokens et les helpers de defilement existants.

**Tech Stack:** JavaScript ESM sans framework, CSS existant, node:test, Playwright Chromium/WebKit ; NestJS consulte comme contrat de donnees, sans modification backend prevue.

Design associe : `docs/plans/2026-09-09-zwibba-buyer-ui-hierarchy-design.md`.

Statut : planification uniquement. Les taches de fonctionnalite ci-dessous ne sont pas executees. Etat de depart constate : `codex/stable-category-chip-height`, commit `d7d3802` local, correctif des hauteurs present. Relever de nouveau le trunk, la branche et le diff avant execution ; ne pas attribuer a cette session une livraison du correctif deja local.

Lire `README.md`, `docs/operations/git-and-releases.md` et les consignes AGENTS avant operations Git. Executer dans une branche `codex/` avec ownership exclusif. Les taches RED volontairement en echec ne sont jamais deployables ; un commit par tache, sans amend. Pour une assertion sur un comportement deja present, constater PASS et conserver la protection, sans fabriquer un echec.

### Task 1: Indexer la paire de documents

**Files:**
- Create: `docs/plans/2026-09-09-zwibba-buyer-ui-hierarchy-design.md`
- Create: `docs/plans/2026-09-09-zwibba-buyer-ui-hierarchy-implementation.md`
- Modify: `docs/plans/README.md`

**Step 1: Write the change**

Ajouter les deux noms de fichiers aux documents prioritaires, conserver les decisions refusees et integrer la revue Astra dans le design. Si ce commit documentaire existe deja, noter la tache satisfaite par son SHA ; ne pas creer un commit vide.

**Step 2: Verify**

Run: `rg -n '2026-09-09-zwibba-buyer-ui-hierarchy-(design|implementation)\.md' docs/plans/README.md`

Expected: deux lignes, une par document. `git diff --check` ne retourne aucune erreur.

**Step 3: Commit**

```bash
git add docs/plans/README.md docs/plans/2026-09-09-zwibba-buyer-ui-hierarchy-design.md docs/plans/2026-09-09-zwibba-buyer-ui-hierarchy-implementation.md
git commit -m "docs: plan buyer ui hierarchy"
```

### Task 2: Definir les contrats de filtrage en echec

**Files:**
- Create: `tests/buyer-filters.test.mjs`
- Modify: `tests/app-buyer-routing.test.mjs`

**Step 1: Write the failing tests**

Specifier le futur module `App/utils/buyer-filters.mjs`, a creer en Task 3. Exports prevus : `normalizeBuyerFilters(raw, { countryCode })` retourne `{ filters, errors }`, `matchesBuyerFilters(listing, filters)` retourne un booleen, `getBuyerZoneOptions(items)` retourne les zones dedupliquees. Les filtres normalises contiennent `zone`, `minPrice`, `maxPrice`, `currency`, avec null pour les bornes et devise absentes.

Fixtures : annonce EUR 20 a Bruxelles, EUR 0 a Liege, CDF 20 et USD 20 a Kinshasa, montant manquant, legacy CDF, legacy USD ambigu. Tester zero/vide, bornes inclusives, montant maximal, min > max, rejet de `12,50`, `-1`, `1e3`, `abc`, repli legacy CDF uniquement, devise requise en RDC quand borne presente, devise seule et zone normalisee. Tester l'intersection avec categorie/recherche et la separation du budget acheteur du flux vendeur. Ne pas modifier `parsePriceInput` utilise par la publication.

**Step 2: Verify RED**

Run: `node --test tests/buyer-filters.test.mjs tests/app-buyer-routing.test.mjs`

Expected: nouveaux tests FAIL car module/methodes absents, anciens tests de route conserves. Consigner les echecs attendus.

**Step 3: Commit**

```bash
git add tests/buyer-filters.test.mjs tests/app-buyer-routing.test.mjs
git commit -m "test: define buyer price and zone filters"
```

### Task 3: Implementer les filtres purs

**Files:**
- Create: `App/utils/buyer-filters.mjs`
- Modify: `App/features/home/buyer-browse-controller.mjs`

**Step 1: Write the minimal implementation**

Implementer le contrat de Task 2 avec `normalizeLocationValueForMatch` existant. Valider les entiers bornes sans conversion permissive. Ajouter au controleur un etat explicite de filtres acheteur et des methodes de validation/application/effacement. Etendre `getFilteredFeed` et `getHomeSections` avec une option explicite pour appliquer ces filtres sur Acheter uniquement ; conserver le comportement actuel par defaut pour les appelants existants. Le nombre de resultats est calcule avant `slice(0, 2)`.

Calculer les options de zone depuis `state.feedItems` non filtres. Le controleur possede les valeurs appliquees et un identifiant de contexte qui change a chaque transition de pays, y compris BE -> CD -> BE. Reinitialiser les filtres lors d'un changement effectif de pays ; ignorer les reponses obsoletes ou garder le chargement tant que le flux du pays courant n'est pas pret. Ne pas masquer une erreur de chargement comme un vrai resultat vide. Aucune requete API par frappe ni nouvelle API.

**Step 2: Verify GREEN**

Run: `node --test tests/buyer-filters.test.mjs tests/app-buyer-routing.test.mjs tests/buyer-browse-search-signal.test.mjs tests/listings-live-api.test.mjs`

Expected: PASS pour filtres, routes et contrats de recherche/reseau existants.

**Step 3: Commit**

```bash
git add App/utils/buyer-filters.mjs App/features/home/buyer-browse-controller.mjs
git commit -m "feat: filter buyer listings by price and zone"
```

### Task 4: Definir recherche, formulaire et retour catalogue en echec

**Files:**
- Modify: `tests/app-buyer-home.test.mjs`
- Modify: `tests/app-tab-shell.test.mjs`
- Modify: `tests/seller-public-screen.test.mjs`
- Modify: `tests/in-app-brand.test.mjs`
- Modify: `tests/country-indicator.test.mjs`
- Modify: `tests/app-home.test.mjs`
- Create: `tests/buyer-browse-view-state.test.mjs`

**Step 1: Write the failing tests**

Ajouter des assertions de comportements rendus : filtre ferme initialement, labels zone/prix/devise, synthese des valeurs appliquees, commande d'effacement quand active, zero present et texte malveillant echappe. Ajouter `aria-pressed`/`aria-current`. Verifier Acheter sans bloc de prise de photo et Vendre avec entree de capture : ces deux gardes doivent deja passer, sans exiger une nouvelle image decorative.

Specifier le nouveau `App/utils/buyer-browse-view-state.mjs` : capture/restauration par derniere route rendue de defilement et focus, origine Acheter/Vendre/profil personnel/profil vendeur conservee pendant chargement/erreur/auth, retour fiche -> profil vendeur -> fiche -> catalogue et profil -> fiche -> profil. Le brouillon du volet appartient a cet etat de vue (valeurs brutes, ouverture, erreurs, identifiant de contexte pays). Tester restauration sur meme contexte seulement, abandon a Annuler/fermeture, changement de pays volet ouvert puis reponse lente de l'ancien pays, changement de categorie pendant saisie. Aucun stockage persistant. Exposer une petite factory `createBuyerBrowseViewState()` dont les methodes et donnees sont definies par ces cas, en reutilisant les trois helpers existants de scroll/recherche/categories.

Ajouter aux tests du profil public les destinations de retour explicites et leur repli `#buy`, dans tous ses etats. Les tests de fiche de Task 6 couvriront l'autre cote de cette chaine.

Ajouter les contrats de la topbar proposes autour du positionnement de marque valide : signature Z + Zwibba distincte du pays, nom non traduisible et intact, absence de slogan/BETA, pays affiche une fois sur Acheter, selecteur semantique pour un visiteur et contexte non trompeur pour un compte connecte. Le composant conserve l'echappement des valeurs. Le profil public doit avoir la marque dans loading/error/ready. Lors de l'execution de ce design, remplacer le test existant qui exige le badge BETA sur Vendre par le nouveau comportement propose, en gardant la protection de l'entree de capture. Aucun test ne doit simplement recopier une declaration CSS.

**Step 2: Verify RED**

Run: `node --test tests/app-buyer-home.test.mjs tests/app-tab-shell.test.mjs tests/seller-public-screen.test.mjs tests/buyer-browse-view-state.test.mjs tests/in-app-brand.test.mjs tests/country-indicator.test.mjs tests/app-home.test.mjs`

Expected: FAIL seulement sur nouveaux controles/ARIA/etat absents ; protections photo existantes PASS.

**Step 3: Commit**

```bash
git add tests/app-buyer-home.test.mjs tests/app-tab-shell.test.mjs tests/seller-public-screen.test.mjs tests/buyer-browse-view-state.test.mjs tests/in-app-brand.test.mjs tests/country-indicator.test.mjs tests/app-home.test.mjs
git commit -m "test: define buyer filter and return interactions"
```

### Task 5: Raccorder les interactions acheteur

**Files:**
- Create: `App/features/home/buyer-filter-bar.mjs`
- Create: `App/utils/buyer-browse-view-state.mjs`
- Modify: `App/features/home/buy-screen.mjs`
- Modify: `App/features/home/home-screen.mjs`
- Modify: `App/components/app-tab-shell.mjs`
- Modify: `App/components/in-app-brand.mjs`
- Modify: `App/features/profile/seller-public-screen.mjs`
- Modify: `App/app.js`

**Step 1: Write the minimal implementation**

Creer `renderBuyerFilterBar({...} = {})`, pur et echappe, racine `.app-buyer-filters`, a base de details/summary, select zone et champs prix. Utiliser les valeurs appliquees pour le resume et un brouillon pour les inputs. Lier le submit via `data-form="buyer-filters"`, les commandes via `data-action`, les labels via for/id lorsque necessaire. Le summary reste hors du form ; Annuler et Effacer ont type=button. Observer `toggle` par listener direct ou capture, car il ne remonte pas comme un clic ; un toggle programmatique de restauration ne doit pas effacer la saisie. En cas d'erreur, rester ouvert, conserver la saisie et focaliser le premier champ invalide.

Dans `App/app.js`, ajouter les handlers appliquant/effacant les filtres, la capture du brouillon avant rerendu et la conservation du focus. Le contexte pays du controleur invalide prioritairement toute ancienne capture de formulaire. Les saisies de filtre n'appellent pas `renderApp` a chaque frappe. Preserver la recherche existante ; les changements de resultats mettent a jour une seule annonce `aria-live="polite"`, sans noyer le lecteur d'ecran. Appeler explicitement les sections filtrees sur Acheter et non sur Vendre.

Capturer la vue sous `lastRenderedRouteKey` avant destruction du DOM, sans confondre son origine avec le hash deja change. Restaurer le scroll desktop interne ou le scroll page mobile, le defilement horizontal et le focus au retour fiche/navigateur. Ajouter au renderer du profil public des options `returnRoute`/`returnLabel`, echappees, par defaut `#buy`/« Retour aux annonces », et faire passer le contexte depuis `App/app.js`. Les options analogues de la fiche arrivent en Task 7. Conserver le clic de l'onglet actif qui remonte en haut. Ajouter ARIA selection aux categories des deux ecrans et a la navigation, sans nouvelle abstraction de categories. Ne pas changer les liens generiques ni le routage par defaut.

Reorganiser le composant de marque partage pour separer signature et contexte pays, en conservant un point de rendu commun pour ses appelants. Ajouter `translate="no"` a Zwibba, retirer les slogans/badge de ce rendu et nettoyer leurs arguments dans les deux accueils. Ajouter la marque au profil public. Le pays ne doit plus etre un lien trompeur vers `#buy`. Pour Acheter visiteur, deplacer le choix BE/CD dans ce contexte via une option explicite et supprimer l'ancien affichage duplique ; reutiliser `set-browse-country`, sans changer les regles des comptes connectes. Un details/summary natif et des boutons de choix suffisent, avec focus/fermeture controles ; pas de modal supplementaire. La topbar est un conteneur semantiquement compatible avec les headers deja presents, sans header imbrique.

**Step 2: Verify GREEN**

Run: `node --test tests/app-buyer-home.test.mjs tests/app-tab-shell.test.mjs tests/seller-public-screen.test.mjs tests/buyer-browse-view-state.test.mjs tests/buyer-search-render-state.test.mjs tests/buyer-category-scroll-render-state.test.mjs tests/app-buyer-routing.test.mjs`

Run: `node --test tests/in-app-brand.test.mjs tests/country-indicator.test.mjs tests/app-home.test.mjs`

Expected: PASS ; controle manuel de la saisie complete par l'E2E de Task 9.

**Step 3: Commit**

```bash
git add App/features/home/buyer-filter-bar.mjs App/utils/buyer-browse-view-state.mjs App/features/home/buy-screen.mjs App/features/home/home-screen.mjs App/components/app-tab-shell.mjs App/components/in-app-brand.mjs App/features/profile/seller-public-screen.mjs App/app.js
git commit -m "feat: add compact buyer filters and restore browsing context"
```

### Task 6: Definir la hierarchie contact et avis en echec

**Files:**
- Modify: `tests/listing-detail-screen.test.mjs`
- Create: `tests/listing-review-render-state.test.mjs`
- Create: `scripts/e2e/listing-review-click.mjs`

**Step 1: Write the failing tests**

Assert que `data-contact-actions` precede description, vendeur, avis et formulaire dans le DOM acheteur ; un seul message primaire, secondaires WhatsApp/Appeler selon donnees, partage conserve. Le formulaire est sous un details ferme, declencheur « Donner un avis », bouton de soumission secondaire. Note/compteur connus et absence d'avis restent accessibles. Le lien vendeur depend de son ID ; pas de contenu d'avis invente. Preserver tous les cas proprietaire/lifecycle, erreurs, images, devises et zero.

Specifier les options de retour `returnRoute`/`returnLabel` sur fiche, avec defaults `#buy`/« Retour aux annonces », dans loading/error/ready. Creer les tests du futur `App/utils/listing-review-render-state.mjs` : brouillon par slug, conservation note/commentaire/ouverture au changement de photo, partage et auth, erreur conservatrice, succes seul effacant les valeurs, isolation entre annonces et vidage a deconnexion/changement de compte. Les appels en vol empechent un double submit.

Creer un petit scenario Playwright de clic natif dans `scripts/e2e/listing-review-click.mjs`, prenant `UI_TEST_BASE_URL`, uniquement avec fixtures reseau et session locales. Cliquer le bouton d'envoi et attendre la requete interceptee avec delai borne ; la simple presence du formulaire ou un `dispatchEvent('submit')` ne suffit pas. Inclure les formulaires reponse vendeur/signalement pour borner le risque du listener commun.

**Step 2: Verify RED**

Run: `node --test tests/listing-detail-screen.test.mjs tests/listing-review-render-state.test.mjs`

Expected: FAIL sur ordre et formulaire replie ; actions proprietaire et contrats de contact existants restent valides.

Run: `npm run build`, puis lancer un serveur local sur un port libre (par exemple `PORT=4340 npm start`).

Run: `UI_TEST_BASE_URL=http://127.0.0.1:4340 node scripts/e2e/listing-review-click.mjs`

Expected: FAIL sur l'envoi par clic natif qui n'atteint pas la requete d'avis, si le risque statique est reproduit. Si le clic fonctionne deja, conserver le test et rechercher pourquoi avant de modifier la delegation ; consigner explicitement ce constat, sans fabriquer un echec. Le module d'etat encore absent peut rester RED independamment.

**Step 3: Commit**

```bash
git add tests/listing-detail-screen.test.mjs tests/listing-review-render-state.test.mjs scripts/e2e/listing-review-click.mjs
git commit -m "test: prioritize listing contact over reviews"
```

### Task 7: Reorganiser la fiche annonce

**Files:**
- Modify: `App/features/listings/listing-detail-screen.mjs`
- Create: `App/utils/listing-review-render-state.mjs`
- Modify: `App/app.js`

**Step 1: Write the minimal implementation**

Rendre le bloc de contact immediatement apres les informations essentielles et la galerie, avant description/avis. Creer des wrappers de mise en page uniquement pour le DOM utile au responsive. Ajouter les options explicites de retour prevues en Task 6 et transmettre l'origine depuis `App/app.js`. Compacter le vendeur et ses notes existantes, supprimer son apparence de verification non justifiee, utiliser un details/summary autour du formulaire, summary hors de son ancetre `data-action`. Garder les conseils de securite accessibles dans le flux.

Creer le module d'etat d'avis selon Task 6 et le raccorder au rendu, changement de miniature, partage et auth. Conserver `data-action="submit-review"`, le service actuel et ses regles ; erreurs/valeurs persistent apres echec et confirmation apres succes. Corriger la delegation de clic de `App/app.js` : ne pas appeler `preventDefault()` pour un formulaire simplement trouve par `closest('[data-action]')` ; consommer uniquement les actions de clic traitees, laisser le submit natif atteindre le listener submit. Verifier aussi reponse vendeur et signalement utilisant cette delegation partagee. Desactiver le bouton et bloquer la double requete pendant envoi.

Partager devient utilitaire et les moyens de contact secondaires restent libelles. Le contact reste dans le flux, sans nouvelle barre fixe. Le rendu proprietaire garde uniquement ses actions de gestion. Associer les champs d'avis a des libelles accessibles.

**Step 2: Verify GREEN**

Run: `node --test tests/listing-detail-screen.test.mjs tests/listing-review-render-state.test.mjs tests/listing-share.test.mjs tests/reviews-service.test.mjs tests/review-reports-service.test.mjs tests/seller-public-screen.test.mjs tests/seller-listing-lifecycle-service.test.mjs`

Run: `npm run build`, puis `UI_TEST_BASE_URL=http://127.0.0.1:4340 node scripts/e2e/listing-review-click.mjs` sur le serveur local et son port releve en Task 6.

Expected: PASS ; une seule requete d'avis pour un clic, et aucun nouveau droit ni endpoint de contact/avis. Les reponses vendeur et signalements restent fonctionnels.

**Step 3: Commit**

```bash
git add App/features/listings/listing-detail-screen.mjs App/utils/listing-review-render-state.mjs App/app.js
git commit -m "feat: make listing contact primary and reviews compact"
```

### Task 8: Appliquer les dimensions et la sobriete visuelle

**Files:**
- Modify: `App/app.css`
- Modify: `App/features/home/buy-screen.mjs`
- Modify: `App/features/listings/listing-detail-screen.mjs`
- Create: `App/components/buyer-icons.mjs` (seulement si aucun adaptateur Lucide existant)

**Step 1: Write the scoped visual changes**

Un seul champ de recherche, icones officielles Lucide locales pour Search/Share si necessaire, sans React/CDN. Verifier d'abord tout adaptateur existant pour le reutiliser. Supprimer les pseudo-elements de loupe seulement sur la nouvelle recherche acheteur. Stabiliser les lignes du catalogue avec alignement en haut et media 4:3. Conserver le correctif `d7d3802` et des hauteurs compatibles avec le zoom.

Appliquer les fonds `var(--bg)`, `var(--surface)` et couleurs de texte/ligne existants, supprimer halos et gradients decoratifs des surfaces concernees, focus explicite conserve. Aucune modification globale de `src/site/styles.css`. Une colonne mobile ; fiche a deux colonnes a partir de 1024 px, sans carte autour de toute la fiche. Respecter la nav existante et sa safe-area ; laisser les textes longs revenir a la ligne.

Les petits ajustements CSS sont verifies visuellement, sans tests qui recopient leurs declarations. Tout changement d'interaction inattendu retourne a une regression comportementale avant correction.

Topbar : appliquer la section 2 du design. Ligne de marque de 64 px minimum hors safe-area, symbole 32 px, nom 24 px mobile/28 px desktop, texte entier, pays a droite. Preserver les tokens et le symbole existants, enlever la capsule/ombre supplementaire ; ne pas retoucher l'identite de marque. Positionner la ligne complete avant les commandes Retour/Partager dans les conteneurs partages, y compris les vues compactes et le profil public. Ces commandes restent dans une ligne contextuelle de 44 px et ne changent pas la position de la signature. La topbar suit le flux et peut grandir au zoom texte. Eviter les ellipses sur Zwibba et les noms de pays. S'assurer que la reserve de hauteur reste compatible avec les criteres premier ecran des annonces et du contact.

**Step 2: Verify**

Run: `npm run build`

Run: `node --test tests/app-shell-ui.test.mjs tests/app-buyer-home.test.mjs tests/listing-detail-screen.test.mjs`

Expected: PASS. Examiner la compatibilite des anciens tests CSS avec le contrat approuve ; ne pas affaiblir un test de hauteur ou d'absence de chevauchement pour obtenir un PASS. Captures multi-format obligatoires en Task 9.

**Step 3: Commit**

```bash
git add App/app.css App/features/home/buy-screen.mjs App/features/listings/listing-detail-screen.mjs
```

Ajouter explicitement `App/components/buyer-icons.mjs` s'il a ete cree.

```bash
git commit -m "style: simplify buyer surfaces and stabilize listing media"
```

### Task 9: Verifier le parcours complet et consigner les preuves

**Files:**
- Create: `scripts/e2e/buyer-ui-hierarchy.mjs`
- Create: `docs/deployment/2026-09-09-buyer-ui-hierarchy-qa.md`

**Step 1: Write the behavioral verification**

Creer un scenario Playwright avec `UI_TEST_BASE_URL`, sur le modele des scripts existants, et des fixtures interceptees pour flux/detail/messages/avis. Les fixtures couvrent BE/CD, 0/1/plusieurs annonces, categorie vide, montant zero, devises, longues zones/titres, reponses lentes/erreurs et un proprietaire. Ne jamais creer de donnees de test en production.

Valider tous les criteres du tableau de recette du design. Capturer Chromium/WebKit aux largeurs 320/390/768/1024/1440, hauteur 844 pour mobile et 900 pour desktop. A 390x844, avec titre deux lignes et galerie chargee, verifier que le haut du CTA est dans la zone visible au-dessus du bord superieur de la nav ; verifier qu'un scroll permet de voir le bouton entier. Au zoom 200 % et reflow equivalent 400 %, exiger lisibilite et absence de controles masques, sans imposer le premier ecran.

Verifier images chargees, bounding boxes et scroll reels, focus apres retour et soumission, clavier, volet ferme/ouvert, avis replie et absence d'erreurs console. Forcer un vrai rerendu par changement de categorie pendant un brouillon de filtres ; verifier pays change avec volet ouvert et reponses hors ordre. Couvrir les chaines de navigation catalogue/fiche/profil vendeur et profil personnel/fiche. Saisir un avis, changer de photo, ouvrir/fermer Partager, puis cliquer le vrai bouton Envoyer (pas un submit synthetique) : une seule requete interceptee, erreurs/saisie conservees, succes confirme. Tester aussi clics des formulaires reponse vendeur et signalement ainsi que les actions de clic existantes apres la correction du listener partage.

Ajouter une matrice topbar : cinq onglets, fiche, profil vendeur, capture et authentification, avec loading/error/ready pertinents. A 320 px, mesurer que Zwibba et Belgique/RDC restent entiers, que leurs boites ne se recouvrent pas et que les controles tactiles restent >=44 px. Comparer l'alignement du nom entre les onglets et verifier que Retour/Partager restent sur leur ligne contextuelle. Tester selection BE/CD anonyme par clic/clavier puis absence de faux selecteur connecte. Au zoom/reflow, accepter une ligne plus haute mais aucun contenu masque. Les fontes finales et le symbole doivent etre charges ; les reproductions preliminaires de l'audit ne remplacent pas ces captures de l'app complete.

Ajouter le maintien du contenu pendant 65 secondes avec compteur messages intercepte ; cette protection ne remplace pas les tests de rerendu ci-dessus. Aucune temporisation de refresh globale nouvelle. Ecrire une synthese QA indiquant les scenarios passes, echecs et limites.

**Step 2: Verify**

Run: `npm test`

Run: `npm run build`

Run: `npm run smoke:production-contracts`

Run: `npm run smoke:app`

Lancer `PORT=4340 npm start` si le port est libre, sinon choisir un port disponible et reporter sa valeur dans les commandes suivantes.

Run: `UI_TEST_BASE_URL=http://127.0.0.1:4340 node scripts/e2e/buyer-ui-hierarchy.mjs`

Expected: suite root, build, smokes et matrice passent. Utiliser l'outillage Lighthouse deja disponible pour verifier l'accessibilite sur Acheter et fiche chargee ; viser 100, enregistrer les audits reels et ne pas annoncer ce score si l'outil ou le contexte manque. Consigner separement toute recette physique iPhone Safari/Android Chrome, avec preuve d'execution, sinon statut « non execute ».

**Step 3: Commit**

```bash
git add scripts/e2e/buyer-ui-hierarchy.mjs docs/deployment/2026-09-09-buyer-ui-hierarchy-qa.md
git commit -m "test: verify buyer ui hierarchy end to end"
```

## Conditional Release After Implementation

Cette section s'applique uniquement apres execution et verification de la fonctionnalite. La creation/relecture des documents seule ne declenche pas une livraison de l'app.

Respecter le guide du 7 septembre, qui prime sur les anciennes recettes de deploiement. Verifier diff, tests et working tree propre, pousser la branche, ouvrir une PR vers `codex/website-vitrine-backup`, attendre CI et revue, relever les releases precedentes par service, puis fusionner. Verifier le SHA et l'ID Railway de chaque service effectivement affecte ; ne pas uploader aveuglement website et ne pas modifier un historique worktree sale.

Smoke marqueur a introduire par Task 5 : le bundle `/assets/app/app.js` contient `buyer-filters`, et `/assets/app/app.css` contient les styles du nouveau composant `.app-buyer-filters`. Exiger HTTP 200 sur `https://zwibba.com/`, `https://zwibba.com/App/` et `https://website-production-7a12.up.railway.app/`. Verifier les marqueurs du bundle de cette release, puis le clic Acheter sans photo, un filtre et une fiche publique en lecture seule. Verifier aussi l'identite du bundle servi sur l'URL utilisee par Yves.

Ne pas confondre HTTP 200, chaine de code et parcours reussi. En cas d'echec, conserver les preuves et restaurer la release precedente verifiee avec la commande Railway disponible, apres controle du service vise. Consigner SHA, ID, heure et resultat. Les preuves post-deploy ne doivent pas etre presentees comme si elles existaient avant la fusion.
