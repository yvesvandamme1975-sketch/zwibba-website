# Zwibba Legal Acceptance Design

**Date:** 2026-09-07

## Goal
Préparer les CGU, confidentialité et mentions légales BE/CD en français et néerlandais belge, et enregistrer une acceptation explicite par version. Cadrage approuvé par Yves le 7 septembre. L’identité juridique et les engagements non vérifiés restent des décisions à compléter : ne pas publier des documents à champs vides.

## Problem
Les anciens brouillons ne correspondent pas complètement au service, mélangent contrat et consentement facultatif, et aucun registre d’acceptation n’existe. Le parcours OTP crée un compte et une session sans preuve du texte présenté. Des comptes existent déjà ; aucune acceptation antérieure ne doit être inventée.

## Non-Goals
Activation de traitements de scoring/licence de données, nouveau paiement, décision juridique sur l’identité ou l’âge, publication de brouillons. Un canal manuel d’exercice des droits doit être confirmé ; les droits ne disparaissent pas faute de bouton.

## Existing System
AuthService.verifyOtp crée User et Session ; requestOtp retourne un challenge conservé par App/services/auth-service.mjs. SessionAuthGuard appelle requireSessionToken. Les pages publiques sont générées par scripts/build.mjs. Les documents préparés avec Claude sont des propositions à vérifier, non des conditions actuellement applicables.

## Recommended Architecture
### 1. Catalogue commun et publication contrôlée
Conserver les neuf textes dans apps/api/assets/legal, accompagnés d’un manifest avec version, statut draft/published, date et empreintes SHA256. Un chargeur ESM commun au build web et à l’API refuse une publication comportant des placeholders, des textes manquants, une version draft ou une empreinte différente. Le catalogue draft reste inactif et n’affiche pas de faux liens publics.
### 2. Preuve contractuelle
Ajouter TermsAcceptance lié à User avec version, empreinte, texte présenté, marché, langue et date. Le texte est conservé avec la preuve pour éviter une dépendance à une page éditable. L’unicité assure l’idempotence, sans changer la première date. Aucune IP ni information sur l’appareil ajoutée.
### 3. Parcours OTP et comptes existants
requestOtp retourne le texte/version à présenter si le catalogue est publié. verifyOtp valide une acceptation explicite et la version avant de consommer le code ; la création ou mise à jour du compte, la preuve et la session sont atomiques. Un catalogue inactif conserve le comportement actuel.
Les sessions existantes disposent d’un endpoint de statut et d’un endpoint d’acceptation authentifié. requireSessionToken protège les opérations nécessitant un compte lorsqu’une version publiée manque ; les endpoints de consultation et d’acceptation peuvent valider la session sans exiger cette même acceptation. La consultation publique reste disponible en se déconnectant.
### 4. Interface
Case CGU non précochée dans l’écran OTP, liens vers les trois documents publiés, aucune case « consentement confidentialité ». Écran de nouvelle acceptation pour les sessions existantes, possibilité de continuer sans compte. Le serveur reste autoritaire si une version change pendant le parcours. Les liens publics et le profil n’annoncent les textes que lorsque le catalogue est publié.
### 5. Déploiement et limites
La préparation peut être vérifiée sur fixtures de catalogue publié, mais le catalogue réel reste draft tant que les données de l’exploitant et les engagements opérationnels manquent. Publier les textes et activer la demande d’acceptation requiert un commit explicite après finalisation. Aucun engagement légal à compléter ne devient automatiquement actif.

## Décision du 7 septembre — adultes et rôle contractuel

Yves décide explicitement d’interdire Zwibba aux mineurs. Le service est réservé aux personnes de 18 ans révolus. La case existante, obligatoire et non précochée, associe déclaration de majorité et acceptation des CGU versionnées, pour inscription et réacceptation. Aucune date de naissance ni preuve d’identité supplémentaire n’est collectée ; cette déclaration ne garantit pas l’âge réel ni à elle seule le respect des conditions Gemini.

Les ventes, paiements et livraisons sont convenus entre vendeurs et acheteurs. L’exploitant conserve ses obligations propres et les responsabilités légalement impératives. Les données d’inscription sont traitées sous sa responsabilité pour les finalités annoncées, sans transfert de propriété ni renonciation des utilisateurs à leurs droits. Le catalogue reste draft tant que les autres faits nécessaires ne sont pas vérifiés.
