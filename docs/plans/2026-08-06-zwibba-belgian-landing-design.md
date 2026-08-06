# Zwibba Belgian Landing (P5) Design

**Date:** 2026-08-06

## Goal

Émettre les vitrines belges — `/be/` (français) et `/be/nl/` (néerlandais) — à partir des modules de locale de P4, avec hreflang, sitemap multi-locale, sélecteur de langue, bannière de suggestion géo sur la vitrine racine, et prix corrects (EUR) sur les pages annonces dynamiques belges.

## Problem

P4 a paramétré le pipeline mais `build()` n'émet toujours qu'un seul arbre (`dist/` racine, fr-CD). Les modules `fr-be`/`nl-be` existent et sont testés mais ne sont consommés nulle part. Les hrefs internes (`/annonces/`, `/annonce/<slug>/`, nav, footer, cartes) sont des chemins racine absolus qui ignorent `site.urlPrefix` ; `buildSitemap` suppose un arbre unique ; aucune page n'émet de `hreflang` ; rien ne relie les trois versions entre elles ni ne signale la version belge aux visiteurs belges de la racine. Enfin, `shared/listing-og.mjs` (pages annonces dynamiques servies par `server.mjs`) formate tous les prix en `fr-FR`/CDF alors que les annonces belges (P1) sont en EUR.

## Non-Goals

- Pas d'annonces de démonstration belges : les modules BE gardent `listings: []` ; les pages `/be/` masquent proprement les sections dépendantes des annonces. Les vraies annonces belges vivent dans l'App et les pages dynamiques `/annonce/<slug>/`.
- Pas de redirection géographique — la bannière racine est une suggestion cliquable, comme en P2.
- Pas de traduction de l'App ni des slugs d'URL (`/be/nl/annonces/` garde `annonces` — cohérence technique avant tout ; traduire les slugs serait un chantier SEO séparé).
- Pas de domaine `zwibba.be` (à brancher plus tard par redirection 301 vers `/be/`).

## Existing System

`build()` (`scripts/build.mjs`) construit un tableau `pages` fr-CD et l'écrit sous `dist/` ; les assets sont copiés une fois et référencés en chemins racine (`/assets/…`), donc déjà agnostiques à la locale. `resolveUrl()` et tous les hrefs internes ignorent `urlPrefix`. `renderLayout` accepte `canonicalPath`. `server.mjs` sert `dist/` avec résolution répertoire→`index.html` (les arbres `/be/…` seront servis sans changement serveur) et pose le cookie `zwibba_geo` (P2) lisible par `src/site/app.js`. `buildListingOgTags` (`shared/listing-og.mjs`) reçoit l'annonce de l'API — qui porte `priceCurrency` depuis P1. Garde de non-régression P4 : la sortie racine fr-CD reste octet pour octet identique (diff contre référence), hors ajouts sanctionnés.

## Recommended Architecture

### 1. hrefs préfixés puis boucle `buildLocale`

Un helper `localeHref(site, path)` (= `site.urlPrefix + path`) remplace tous les hrefs internes des templates vitrine (nav, footer, cartes, CTA, canonical, liens annonces) — pour fr-CD (`urlPrefix: ''`), sortie inchangée. Puis `build()` devient une boucle sur `[fr-cd → dist/, fr-be → dist/be/, nl-be → dist/be/nl/]` : les pages de chaque locale sont écrites sous son préfixe, les assets et l'App une seule fois à la racine. Les sections dépendantes de `listings` (grille d'annonces de l'accueil, cartes de la page annonces, pages `/annonce/…` statiques) sont masquées/omises quand `listings` est vide, avec le `resultsFallback` de la locale sur la page annonces.

### 2. hreflang + sitemap multi-locale

Chaque page vitrine émet ses alternates : `<link rel="alternate" hreflang="fr" href="<racine>">`, `hreflang="fr-BE"`, `hreflang="nl-BE"`, `x-default` → racine, en croisant les trois arbres sur le même chemin logique. Le sitemap unique à la racine agrège les pages des trois locales (les pages BE sans équivalent — aucune — n'existent pas : mêmes chemins logiques partout, sauf pages `/annonce/…` statiques absentes en BE, listées uniquement pour fr-CD).

### 3. Sélecteur de langue + bannière géo vitrine

Le footer de chaque vitrine affiche les trois versions (« RDC (FR) · Belgique (FR) · België (NL) », page équivalente, `hreflang` cohérent). Sur les pages **racine** uniquement, `src/site/app.js` lit le cookie `zwibba_geo` (déjà posé par `server.mjs`) : si `BE` et pas de choix mémorisé (`localStorage zwibba_site_country`), une bannière discrète propose « Zwibba existe en Belgique → /be/ » avec fermeture persistée — chaînes dans `ui.client`, même philosophie suggère-sans-forcer que P2.

### 4. Prix des annonces dynamiques par devise

`buildListingOgTags` formate le prix selon `listing.priceCurrency` (EUR → `Intl.NumberFormat('fr-BE')` + « € », USD → « US$ », défaut CDF inchangé) — le contenu OG des annonces belges partagées sur WhatsApp devient correct sans attendre la localisation complète de cette page dynamique.
