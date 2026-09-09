# Zwibba Topbar Brand Refresh Design

**Date:** 2026-09-09

## Goal

Appliquer la topbar validee par Yves : Z + Zwibba a gauche, contexte pays separe a droite, sans slogan ni badge Beta. Ce lot extrait la section topbar du plan buyer-ui-hierarchy, dont les filtres/avis restent a executer separement.

## Problem

Le nom est trop petit, le pays/Beta cassent sur mobile et la marque se deplace apres Retour. Le pays est un lien vers Acheter et un second selecteur est affiche dessous. Le profil public omet la marque.

## Non-Goals

Pas de changement des regles d'authentification ou de marche connecte, des filtres, des avis, des etats vides ni de la vitrine. Conserver la prise de photo dans Vendre. Pas de nouvelle barre fixe.

## Existing System

`App/components/in-app-brand.mjs` est partage par les ecrans. `App/app.js` expose le pays actif et gere `set-browse-country`. `App/app.css` contient la signature et les layouts home/flow. Les retours actuels sont conserves ; leur memoire de navigation appartient au plan general.

## Recommended Architecture

### 1. Signature partagee

Le renderer produit `.app-topbar` contenant la signature Z + Zwibba et, separement, le pays. Nom protege `translate=no`, symbole existant de 32 px sans double capsule. Ligne de 64 px minimum, nom 24 px mobile/28 px desktop, hauteur extensible au zoom. Meme inset par rapport au contenu de chaque ecran ; les colonnes desktop gardent leurs largeurs lisibles actuelles.

### 2. Pays et interactions

Acheter visiteur propose le choix BE/CD dans un details/summary natif a droite, avec actions existantes. Les autres ecrans et comptes connectes montrent un libelle statique, sans faux lien. Escape ferme et rend le focus, clic exterieur ferme ; la selection conserve le focus apres chargement asynchrone. Texte de pays explicite sans dependre d'un emoji.

### 3. Contexte des sous-vues

La marque precede Retour dans le DOM et visuellement. Retour conserve sa destination et une cible de 44 px ; Partager ne doit pas etre duplique ni modifier les contrats existants. Ajouter la signature sur les trois etats du profil public. Les ecrans compacts utilisent le meme nom lisible, sans une variante miniature.

### 4. Verification

Tests unitaires RED/GREEN du rendu et des marches. Chromium/WebKit, 320/390/768/1024/1440 px, controle des boites, textes et focus ; visiteur/connecte, chargement/erreur, choix de pays, Retour, zoom 200 %. Suite root, build et smokes. Verifier ensuite le SHA Railway et la topbar en ligne en lecture seule. La recette emulee ne constitue pas une recette sur telephone physique.
