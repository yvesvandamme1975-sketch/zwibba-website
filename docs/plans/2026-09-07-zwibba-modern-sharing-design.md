# Zwibba Modern Sharing Design

**Date:** 2026-09-07

## Goal
Unifier un partage fiable sur téléphone et ordinateur pour les annonces Belgique/RDC. Cadrage approuvé explicitement par Yves le 7 septembre. L’ensemble juridique et le registre d’acceptation feront l’objet d’une paire dédiée dans cette même réalisation ; leur publication attend l’identité de l’exploitant.

## Problem
L’annulation native déclenche un téléchargement, le titre WhatsApp peut venir d’un autre brouillon, les erreurs sont masquées et les compteurs assimilent l’ouverture à une publication. L’image story verticale sert d’aperçu horizontal. Le dialogue ne gère pas le focus.

## Non-Goals
Publication automatique aux réseaux, SDK social, réécriture des anciens worktrees, métrique de publications confirmées que les API navigateur ne fournissent pas.

## Existing System
App/app.js orchestre renderShareMenu et les actions ; post-flow-controller possède un ancien helper de partage. StoryImageService produit un PNG R2 et shared/listing-og.mjs produit les métadonnées. L’API incrémente un shareCount historique non fiable. Revue indépendante : docs/operations/2026-09-07-cgu-sharing-review.md.

## Recommended Architecture
### 1. Contrôleur dédié
Créer App/services/listing-share.mjs : contexte immuable d’annonce, préparation bornée du fichier avant clic, actions synchrones vers share/open, résultats explicites copied/handed-off/opened/cancelled/error/manual. Aucune publication réelle n’est affirmée. Arrêter d’alimenter le compteur historique depuis ce parcours et documenter sa limite ; ne pas inventer un nouveau suivi personnel pour ce correctif.
### 2. Un dialogue commun
Actions lien natif, WhatsApp, Facebook, copie, image et légende. Instagram/TikTok affichent les étapes manuelles dans le dialogue. État visuel preparing/ready/unavailable, reprise explicite, annulation sans effet secondaire. Contextes provenant du déclencheur et uniquement d’un détail portant le même slug. Préservation du focus malgré le rendu complet, arrière-plan inert, Échap et retour au déclencheur.
### 3. Deux formats et marchés
Produire un PNG paysage 1200x630 à côté du PNG story. Ajouter Listing.shareImageUrl nullable via Prisma, exposer le marché et cette URL dans les réponses publiques. Les anciens contenus utilisent leur photo réelle tant qu’aucun paysage n’a été produit. Pas de régénération massive implicite. Image de repli neutre, titre sans prétendre que le lecteur est vendeur, devise et locale du marché. Un échec API ne doit pas créer une fausse annonce RDC avec réponse 200.
### 4. Vérification
Tests des actions avec dépendances simulées, tests du dialogue et recette navigateur, tests des dimensions et du stockage, métadonnées BE/CD, disponibilité des pages publiques. Revue Claude avant PR. CI et vérification distincte website/API, image test et marqueur du bundle. Un essai de la feuille native sur iPhone réel reste à confirmer avec Yves.
