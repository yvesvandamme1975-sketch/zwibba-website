# Topbar Zwibba : recette du 9 septembre 2026

## Portee

Signature Z + Zwibba a gauche, pays distinct a droite, suppression slogan/Beta, marque avant Retour et presente sur le profil public. Choix pays uniquement sur Acheter visiteur, politique de marche connecte conservee. Le correctif de hauteur des categories deja approuve est inclus ; le reste du plan buyer-ui-hierarchy ne fait pas partie de cette livraison.

La recette a revele une boucle preexistante : en erreur, les donnees nulles d'une fiche/vendeur/conversation provoquaient une nouvelle requete a chaque rendu. Le correctif `4aabcba` respecte l'etat et l'identite, et autorise une nouvelle tentative lors d'une reentree utilisateur. Le polling normal de messagerie n'est pas change. La deviation est expliquee en Task 3b du plan.

Une assertion de route a aussi revele que le profil public etait exclu des routes accessibles sans brouillon et redirigeait donc vers capture. `1d68758` ajoute seulement `seller` a l'ensemble des routes autorisees ; les gardes des vrais ecrans de brouillon restent intactes (Task 3c). Ce test echouait avant correction (`capture` au lieu de `seller`) ; les 7 tests du module passent ensuite.

## Verification locale

- Topbar : 8 nouveaux echecs RED observes avant implementation, puis 79/79 tests cibles PASS.
- Stabilite des erreurs : 7 echecs RED observes, puis 27/27 tests cibles PASS (dont 13 nouveaux contrats).
- `npm test` : 542/542 PASS apres le dernier changement source. Premiere tentative sous sandbox : 12 echecs d'ouverture de serveurs HTTP (EPERM), resolus par une execution autorisee ; aucun test retire.
- `npm run build`, `npm run smoke:app`, `npm run smoke:production-contracts` : PASS.
- Revue independante de la topbar et revue complementaire du correctif d'erreur : aucun constat bloquant. Le correctif d'une ligne du garde seller a ete revu localement et verifie en TDD/E2E.
- Matrice Playwright finale PASS a 12:36 CEST : Chromium et WebKit, 320/390/768/1024/1440 px. Commande : `UI_TEST_BASE_URL=http://127.0.0.1:4340 node scripts/e2e/topbar-brand-refresh.mjs`.
- Chaque configuration couvre les cinq onglets, annonce et vendeur publics, capture/phone/accueil auth, comptes simules sur cinq routes dont conversation, choix BE/CD, Escape/clic exterieur/clavier, focus apres reponse differee, texte double, chargement puis rendu, erreurs 503 sans requetes en boucle, et Retour. Le test verifie le type de route reel, pas seulement la presence d'une marque.
- Hauteur des categories identique avant/apres filtre vide. Acheter sans bloc photo, Vendre avec son entree capture. Aucun pageerror dans la matrice.
- Captures generees dans `/tmp/zwibba-topbar-qa/`, avec attente des images visibles chargees. Revue visuelle notamment de `webkit-390-buy.png`, `chromium-390-sell.png`, `chromium-1440-listing-fixture.png` et `chromium-320-text-200.png`.

## Accessibilite et limites

La marque mesure 24 px sur mobile/tablette, 28 px a partir de 920 px ; le logo reserve 32 x 32 px. Topbar 64 px minimum, pays/Retour au moins 44 px. Le texte a 200 % est teste via taille racine doublee, pas via un zoom natif de navigateur. La topbar se replie sans collision ; la navigation inferieure existante peut chevaucher ses libelles a 320 px avec texte double : reste hors du lot topbar et a reprendre dans le plan UI/UX.

Verification de contraste sur les tokens : sur `--surface-strong` (#2b2f33), texte principal 12,53:1, pays discret 6,69:1 et contour de focus vert 8,45:1. Ce calcul controle ces couleurs, pas un audit exhaustif des pixels du fond degrade existant. Le focus visible est aussi controle dans le navigateur.

WebKit sur macOS utilise Option-Tab pour ce parcours de controles natifs ; le test conserve Tab sur Chromium. Reference : [raccourcis Safari Apple](https://support.apple.com/guide/safari/keyboard-and-other-shortcuts-cpsh003/mac).

API interceptee localement, faux compte exclusivement navigateur, aucune annonce ni donnee E2E creee en production. Les tests authentifies ne prouvent pas l'OTP reel. Chromium/WebKit emules ne constituent pas une recette sur iPhone Safari ou Android Chrome physiques. Aucun score Lighthouse annonce.

## References avant livraison

Projet Railway `zwibba-production` (`4e3c7dcb-8abe-4069-9465-c93f1b39f549`), environnement `production` (`7c283d39-2d35-4b99-affe-e18da83de2e2`). Releve avant fusion :

| Service | Deployment actif | SHA annonce par Railway | Etat |
| --- | --- | --- | --- |
| website | 52894c61-47b5-452e-a1b2-058235ac9c8e | d2c2379952208913ec49eef70a5bace338ad6828 | SUCCESS |
| api | 079617e7-cae8-49cd-81e3-e7ef1998585f | d2c2379952208913ec49eef70a5bace338ad6828 | SUCCESS |
| admin | 7b7e1506-c1d4-4efb-a2b0-0c359b84f31e | Non expose | SUCCESS |

Website et API sont relies au depot. Admin n'est pas modifie dans ce lot ; son SHA n'est pas deduit de son statut. Ces IDs servent de references de retour arriere, pas de preuve d'une nouvelle livraison.

## Apres livraison

A renseigner apres CI, fusion, verification du SHA/deployment et sondes HTTP/parcours en ligne. Marqueurs attendus : `data-market-toggle` dans `/assets/app/app.js` et `.app-topbar` dans `/assets/app/app.css`.
