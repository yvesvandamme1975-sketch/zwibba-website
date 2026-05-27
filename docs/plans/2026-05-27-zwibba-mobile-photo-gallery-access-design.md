# Zwibba Mobile Photo Gallery Access Design

**Date:** 2026-05-27

## Goal

Permettre au vendeur Zwibba sur mobile de choisir une photo existante depuis sa galerie au lieu d'être forcé à ouvrir l'appareil photo. Aujourd'hui sur mobile (testé Samsung Chrome, signalé par Aives le 2026-05-27), l'attribut HTML `capture="environment"` posé sur les trois `<input type="file">` du flux seller force l'OS à ouvrir directement la caméra et masque la sélection depuis la photothèque ; sur desktop le même attribut est ignoré et le sélecteur de fichier marche normalement.

## Problem

Trois écrans du flux seller PWA utilisent `<input type="file" accept="image/*" capture="environment">` :

- `App/features/post/capture-screen.mjs` ligne 132
- `App/features/post/photo-guidance-screen.mjs` ligne 160
- `App/features/post/capture-result-screen.mjs` ligne 127

Cet attribut, défini par la HTML Media Capture spec, demande explicitement au navigateur d'invoquer le device de capture (camera) plutôt qu'un picker générique. Sur Chrome Android, Safari iOS et la plupart des WebView mobiles, le navigateur respecte la consigne et n'expose plus le menu « Photothèque / Prendre une photo / Parcourir ». Sur desktop le même attribut est silencieusement ignoré (pas de caméra par défaut), donc le sélecteur de fichier classique apparaît — ce qui explique l'asymétrie observée par le vendeur.

L'intention produit était l'inverse : le label visible sur `capture-screen.mjs` ligne 91 est `'Choisir ou prendre une photo'` et le hint ligne 125 dit `"Utilisez une vraie photo depuis votre appareil. Sur mobile, l'appareil photo peut s'ouvrir directement."`. Le code de l'attribut a été ajouté par optimisme — « gagner un clic en lançant la caméra » — sans réaliser qu'il supprimait l'accès galerie. En internal beta sur la RDC, où beaucoup de vendeurs prennent leurs photos en plusieurs sessions et les rangent dans Photos / WhatsApp avant de publier, c'est un blocker UX : ils ne peuvent pas publier leurs annonces tant qu'ils sont sur mobile.

Le flux Flutter natif (`apps/mobile/lib/features/post/camera_screen.dart`) utilise un picker Dart qui propose déjà les deux modes ; le bug est exclusivement sur la PWA. Aucun changement Flutter n'est nécessaire.

## Non-Goals

- Ne pas introduire un sélecteur custom à deux boutons (Galerie / Caméra). Le bottom sheet natif du navigateur couvre déjà les deux cas dès que `capture` est retiré, et un composant custom serait moins accessible et plus de surface à maintenir.
- Ne pas restreindre les formats acceptés au-delà de l'`accept="image/*"` existant. Les contraintes finales sur la photo (taille, ratio, contenu) sont déjà gérées par la pipeline post-upload (validation côté `App/services/media.mjs` et côté API `apps/api/src/media/`).
- Ne pas toucher au flux desktop. L'attribut est retiré pour tout le monde mais le comportement desktop est inchangé (le sélecteur de fichier marchait déjà).
- Ne pas modifier le code Flutter. Hors scope.
- Ne pas ajouter de fallback `getUserMedia` pour ouvrir la caméra in-app. Trop de surface (permissions, preview, capture, encoding) pour un gain marginal vs le bottom sheet natif.

## Existing System

Les trois inputs concernés partagent le même contrat HTML :

```html
<input
  class="app-flow__file-input app-flow__file-input--overlay"
  type="file"
  accept="image/*"
  capture="environment"
  data-input="capture-first-photo"
/>
```

Avec parfois un `data-input` différent selon l'écran (`capture-first-photo`, `capture-guided-photo`, etc.) et autour un `<label class="app-capture__picker">` qui contient un `<span>` de label localisé. Le contrôleur JavaScript écoute l'événement `change` sur ces inputs via `App/features/post/post-flow-controller.mjs` et transmet le `File` à la pipeline d'upload. Aucun code JavaScript ne dépend de la présence de l'attribut `capture` — c'est purement de l'intent HTML.

Côté tests, `tests/capture-flow.test.mjs` et `tests/post-flow.test.mjs` couvrent le rendu de ces écrans mais aucun n'assert explicitement la présence ou l'absence de `capture=...`. Aucun test legacy à mettre à jour, juste un nouveau test à ajouter pour verrouiller le contrat.

Le hint ligne 125 de `capture-screen.mjs` est l'unique copy qui parle de l'appareil photo ; les hints équivalents dans les deux autres écrans (`photo-guidance-screen.mjs`, `capture-result-screen.mjs`) sont plus génériques et n'ont pas besoin de réécriture.

## Recommended Architecture

### 1. Retirer l'attribut `capture` des trois inputs

Suppression simple, ligne par ligne, dans les trois fichiers. Aucune logique JS à modifier — l'événement `change` est déclenché de la même manière qu'on vienne de la caméra ou de la galerie, et le contrôleur `post-flow-controller.mjs` ne lit jamais l'attribut.

### 2. Mettre à jour le hint vendeur sur l'écran capture initial

Le hint ligne 125 de `capture-screen.mjs` devient trompeur une fois l'attribut retiré. Réécrire pour refléter la nouvelle réalité : `Utilisez une vraie photo depuis votre appareil. Sur mobile, choisissez dans votre galerie ou prenez une photo.` Le reste de la copy (label `Choisir ou prendre une photo`) est déjà correct.

### 3. Ajouter un test de non-régression

Créer un nouveau test dans `tests/capture-flow.test.mjs` (ou un fichier dédié `tests/capture-input-attributes.test.mjs`) qui assert que chacun des trois `renderXxxScreen` ne produit aucun `capture=` dans son HTML. Le test sert de contrat : si quelqu'un re-rajoute l'attribut plus tard, le test échoue immédiatement.

### 4. Pas de test e2e mobile

L'app PWA est testée par node `--test` sur du HTML stringifié, pas par un vrai navigateur mobile. Un test e2e Playwright en mode mobile-emulation existerait sous `scripts/e2e/` mais la vérification du comportement caméra / galerie passe par le rendu HTML — si l'attribut n'est plus là, le bottom sheet natif fait le reste, garanti par la HTML Media Capture spec côté navigateur.
