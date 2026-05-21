# Zwibba Home Header Beta Badge Design

**Date:** 2026-05-21

## Goal

Marquer visuellement la home screen vendeur comme une version beta en ajoutant un badge `Beta` à côté du brand mark Zwibba dans le topbar, sans déplacer ni écraser le badge `Seller-first` existant.

## Problem

La home screen vendeur (`App/features/home/home-screen.mjs`) ne signale aujourd'hui aucun état de version au visiteur. Le topbar contient deux éléments seulement : le brand mark rendu par `renderInAppBrand({ subtitle: 'Vendez en un clic' })` et le badge `<span class="app-home__badge">Seller-first</span>` aligné à droite par `justify-content: space-between` (voir `App/app.css` ligne 213, `.app-home__topbar`).

L'app est pourtant en phase internal-beta depuis le plan `2026-03-27-zwibba-internal-beta-readiness-design.md` et la buy-screen (`App/features/home/buy-screen.mjs` ligne 46) affiche déjà un badge `Live beta` côté droit. Côté vendeur, l'absence d'indicateur crée deux problèmes : (1) l'utilisateur qui arrive directement sur la home vendeur n'a pas de signal qu'il s'agit d'une beta, ce qui biaise ses attentes et ses retours ; (2) l'asymétrie home vendeur / buy-screen donne une lecture incohérente du produit.

Le composant partagé `renderInAppBrand` dans `App/components/in-app-brand.mjs` n'expose aujourd'hui que `compact` et `subtitle` : il n'a pas de slot pour un badge attaché au brand mark.

## Non-Goals

- Ne pas modifier `App/features/home/buy-screen.mjs` ni son badge `Live beta` existant — le scope est strictement la home vendeur.
- Ne pas remplacer le badge `Seller-first` actuel ni changer sa position dans le topbar.
- Ne pas introduire de bandeau full-width ou de barre d'annonce sous le topbar.
- Ne pas toucher à l'app mobile Flutter (`apps/mobile/`) ni à l'API (`apps/api/`) — c'est un changement purement de présentation côté `App/`.
- Ne pas ajouter de logique conditionnelle (env var, flag, A/B) pour afficher ou masquer le badge — il est rendu en dur dans cette itération.
- Ne pas modifier le wording `Seller-first` ni le subtitle `Vendez en un clic`.

## Existing System

Le topbar de la home vendeur est défini dans `App/features/home/home-screen.mjs` :

```
<div class="app-home__topbar">
  ${renderInAppBrand({ subtitle: 'Vendez en un clic' })}
  <span class="app-home__badge">Seller-first</span>
</div>
```

`App/components/in-app-brand.mjs` rend un container `.app-brand-mark` avec un sous-bloc icône (`.app-brand-mark__icon`, l'image `/assets/brand/favicon.svg`) et un sous-bloc copy (`.app-brand-mark__copy` contenant `<strong>Zwibba</strong>` et un `<span>` optionnel pour le subtitle). Le composant accepte aujourd'hui deux options uniquement : `compact` (booléen, ajoute la modifier class `--compact`) et `subtitle` (string).

Côté CSS (`App/app.css`) :
- `.app-home__topbar` (ligne 213) utilise `display: flex; justify-content: space-between; gap: 14px`.
- `.app-brand-mark` (ligne 220) est un `inline-flex` icône + copy.
- `.app-home__badge` (ligne 271) est une pastille `border-radius: 999px`, `background: rgba(107, 230, 107, 0.12)`, `color: var(--green)`, `font-size: 0.76rem`, `font-weight: 800`.

Les tests qui couvrent le rendu du topbar de la home vivent dans `tests/app-home.test.mjs` — notamment le test `home screen shows the Zwibba in-app brand mark` qui affirme la présence de `/assets/brand/favicon.svg` et du mot `Zwibba`. Aucun test ne couvre actuellement la présence du badge `Seller-first` ni d'un badge `Beta`.

La buy-screen (`App/features/home/buy-screen.mjs` ligne 46) utilise le même pattern mais avec le texte `Live beta` à la place de `Seller-first`. Elle ne touche pas au brand mark — son badge beta est aligné à droite.

## Recommended Architecture

### 1. Étendre `renderInAppBrand` avec un slot `badge`

Ajouter à `App/components/in-app-brand.mjs` une troisième option `badge` (string). Quand `badge` est une chaîne non vide, le composant rend une nouvelle pastille `<span class="app-brand-mark__badge">{badge}</span>` placée à l'intérieur du container `.app-brand-mark`, après le bloc `.app-brand-mark__copy`. Quand `badge` est absent ou vide, rien n'est rendu — la signature reste rétro-compatible avec les appels existants.

Le texte du badge passe par `escapeHtml` (importé depuis `App/utils/rendering.mjs`, déjà utilisé par les autres composants) pour rester safe si l'appelant injecte une valeur dynamique.

Le choix d'ajouter le slot dans le brand mark plutôt qu'à côté dans le topbar évite de casser le `justify-content: space-between` du topbar : le brand mark grandit en largeur, mais le badge `Seller-first` reste plaqué à droite sans wrapper supplémentaire.

### 2. Câbler le badge `Beta` dans la home vendeur

Dans `App/features/home/home-screen.mjs`, l'unique appel à `renderInAppBrand` passe désormais `badge: 'Beta'` en plus du subtitle. Aucun autre changement de markup dans le topbar — le badge `Seller-first` reste à sa place.

La buy-screen n'est volontairement pas touchée dans cette itération (voir Non-Goals). Si une cohérence transverse buy/home est souhaitée plus tard, elle fera l'objet d'un plan séparé qui pourra utiliser le même slot `badge`.

### 3. Styles dédiés `.app-brand-mark__badge`

Ajouter dans `App/app.css`, à la suite des règles existantes `.app-brand-mark__copy span` (vers ligne 256) et avant `.app-brand-mark--compact`, un bloc CSS pour `.app-brand-mark__badge` qui :

- s'affiche en `inline-flex` aligné verticalement avec le texte `Zwibba`
- reprend la palette du badge `Seller-first` (`background: rgba(107, 230, 107, 0.12)`, `color: var(--green)`, `border-radius: 999px`) mais en plus discret (padding plus serré, font-size ~0.62rem, letter-spacing léger, text-transform uppercase) pour qu'il lise comme un tag de version et non comme un second CTA visuel
- ajoute `margin-left: 10px` pour respirer par rapport au copy
- en version `--compact` (modifier déjà géré par le composant), réduit légèrement padding et font-size

Aucune media-query supplémentaire n'est nécessaire — le topbar accepte la largeur supplémentaire sur mobile car le badge `Seller-first` est déjà compact.

### 4. Couverture de test

Étendre `tests/app-home.test.mjs` avec un nouveau test qui assert que le HTML rendu par `renderHomeScreen` contient :

- un élément `.app-brand-mark__badge`
- le texte `Beta` à l'intérieur de ce sélecteur (regex souple : `/app-brand-mark__badge[^>]*>\s*Beta\s*</`)
- et conserve le badge `Seller-first` existant (le badge `Beta` ne le remplace pas)

Le test existant `home screen shows the Zwibba in-app brand mark` reste inchangé et continue de passer.

Pas de test d'intégration browser ni de snapshot visuel dans ce plan — la couverture node `--test` sur le rendu HTML est suffisante pour cette itération.
