# Zwibba — audit UI/UX Impeccable du 8 septembre 2026

Méthode : deux évaluations indépendantes (A : impeccable_design ; B : impeccable_evidence), puis reproduction fonctionnelle, corrections et relecture. Périmètre : site public et PWA, Belgique et RDC. Base : b7ced278. Cette revue ne certifie pas une absence universelle de bugs.

## Intégrité du produit

Le système reste cohérent avec Zwibba : publication à partir d’une photo, navigation inférieure, prix et marchés locaux, partage intégré. Aucun remplacement de marque ni framework. Impeccable officiel 4.2.2, source pbakaus/impeccable au commit 2bc2879276c1f321a53c4ca99d3371e411329b52, chargé temporairement sans installation de hooks. Le détecteur n’a trouvé qu’une alerte indicative de fond quadrillé (src/site/styles.css:45) ; vérifiée, elle ne constitue pas un défaut fonctionnel. Les vrais bugs ci-dessous ont été reproduits dans le navigateur.

## Résultats et corrections

| Priorité | Défaut reproduit | Correction et preuve |
|---|---|---|
| P1 | Trois validations rapides envoient trois demandes de code | Verrou de requête, boutons et état occupé ; une seule requête simulée dans Chromium et WebKit |
| P1 | Erreur d’envoi : le numéro saisi revient au préfixe par défaut | Numéro conservé ; erreur accessible, possibilité de réessayer |
| P1 | Annonces historiques de l’accueil ouvrant une page indisponible | Injection du flux courant par marché, quatre annonces maximum ; repli sans ancienne annonce |
| P1 | Accueil mobile de 390 px débordant à 440 px | CTA empilé correctement ; contrôles à320/390/768/1440px |
| P1 | Navigation tablette de 768 px débordant à 934 px | Menu compact activé avant que les liens débordent |
| P1 | Nom public de40 caractères et messages longs étirant les écrans de compte | Largeur minimale corrigée sur le conteneur et retour à la ligne du contenu utilisateur |
| P2 | Menu mobile ne se fermant pas avec Échap | Fermeture et restitution du focus au bouton |
| P2 | CTA final limité à des boutiques indisponibles | Bouton opérationnel vers la PWA, adapté au marché |
| P2 | Navigation publique sans nom accessible | Nom localisé ajouté au landmark |
| P2 | Jargon OTP dans les écrans de connexion | Libellés français de vérification du numéro et du code reçu |
| P2 | Promesse d’intégrations mobile money absentes | Texte aligné sur les transactions convenues directement entre acheteurs et vendeurs |

Les états occupés couvrent également la vérification du code. Après 503, le code et la case CGU explicite restent conservés pour la même version ; aucun consentement n’est inventé.

## Santé technique indicative

| Dimension Impeccable | Score | Preuve et limite |
|---|---:|---|
| Accessibilité | 3/4 | Axe WCAG A/AA sur pages publiques et fixtures de compte, clavier menu/partage ; pas de recette VoiceOver physique |
| Performance | 3/4 | Bundle de livraison conservé, images dimensionnées, cache du flux 60 s ; pas de mesure terrain Core Web Vitals |
| Responsive | 3/4 | Quatre largeurs et deux moteurs ; pas de certification de tout appareil |
| Thème | 2/4 | Tokens existants conservés, couleurs historiques encore nombreuses ; pas de nouveau thème |
| Intégrité | 3/4 | Parcours réparés ; qualification des annonces système encore à confirmer |
| Total | 14/20 | Bon sur le périmètre contrôlé, certification exhaustive non revendiquée |

Évaluation heuristique initiale indépendante : 24/40, avant corrections. Pas de nouvelle note heuristique inventée après coup.

## Vérifications

- `npm test` : 520 tests réussis après les corrections fonctionnelles.
- `npm run build` et `npm run smoke:production-contracts` réussis.
- `scripts/e2e/ui-public-resilience.mjs` : 24 combinaisons (trois langues, quatre largeurs, Chromium/WebKit).
- `scripts/e2e/ui-auth-resilience.mjs` : 4 cas dans les deux moteurs ; double soumission, erreur503, conservation numéro/code/CGU.
- `scripts/e2e/ui-account-resilience.mjs` : 24 cas Chromium, profil/portefeuille/messages/conversation,320/390/1440px, succès et503.
- Axe : 32 pages/tailles publiques et anonymes, puis 24 cas de compte ; aucune violation automatique A/AA restante détectée dans ces cas après correction.
- Partage : 2 tailles, annulation native, refus du presse-papiers, copie manuelle, instructions Instagram, clavier et focus.
- CGU : 3 parcours simulés, nouveau compte, compte existant et activation pendant la saisie.
- Aucun compte créé, code réel envoyé, message réel partagé ou paiement déclenché par les tests.

## Relecture

Revue indépendante du diff complet favorable, sans P0/P1/P2 identifié. Claude a relu un diff UI expurgé sans outils : plusieurs alertes dépendaient du contexte absent. Vérification dans le code complet : le marqueur utilise `markers[0]` en repli, le menu utilise bien `.is-open`, la traduction `uiStrings.menu.closed` existe, les boutons se replient, l’échappement convertit en chaîne et la restauration OTP/CGU est déjà présente. Les tests correspondants passent. Cette consultation de Claude ne doit pas être présentée comme une recette navigateur faite par Claude.

La dernière revue a demandé de distinguer panne API et catalogue vide ; ce point a été corrigé et revérifié. La revue finale ne relève plus de défaut dans les modifications.

## Points ouverts

1. **Qualification des annonces système (P1 confiance)** : des annonces semées ont des actions de contact comme de vraies annonces. Leur réalité et les coordonnées doivent être confirmées par l’exploitant ; question posée. Aucune annonce ni donnée supprimée par l’audit.
2. Le repli de la page « Annonces » lorsque l’API échoue sans cache affiche maintenant un message d’indisponibilité localisé et un lien de nouvelle tentative, sans remettre en circulation des cartes historiques.
3. L’application reste francophone, y compris depuis le site néerlandais. Pas de traduction intégrale implicite.
4. Aucun test sur iPhone physique, VoiceOver, caméra physique, réception WhatsApp réelle, publication d’annonce en production, vente réelle ou réseau 3G réel. Les comportements correspondants ne sont pas certifiés.

## Suite recommandée

Traiter la qualification des exemples avec Impeccable harden ; recette iPhone physique des parcours caméra/connexion/partage ; Impeccable polish après ces décisions. Les questions esthétiques générales sont omises : l’utilisateur a demandé la fiabilité de l’interface existante.

Questions skipped: les corrections UI reproduites étaient autorisées ; seule la qualification factuelle des annonces système fait l’objet d’une question séparée.
