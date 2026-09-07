# Revue indépendante Claude Code

Revue des sources à e67fd27, pas validation juridique. Les conclusions sont des propositions à vérifier, notamment les obligations légales qui peuvent être traitées manuellement.

Revue lecture seule terminée sur `e67fd27`. Aucun fichier touché, aucune commande de mutation, aucun partage émis.

---

# 1. Partage — 10 constats prioritaires

### 1. L'annulation d'un partage natif est traitée comme un succès
`App/app.js:2392-2415` — `shareAsStory` enveloppe `shareStoryImageNative` dans un `try/catch` aveugle dont le commentaire admet lui-même la confusion (`// Native share unavailable or cancelled`). Quand l'utilisateur ferme la feuille iOS, on tombe dans le `catch`, puis on **télécharge l'image** (`handleStoryImageDownload`) **et on ouvre un onglet** vers `instagram.com`/`tiktok.com`/`facebook.com`. Annuler produit donc plus d'effets que partager. Et les trois appelants (`2554`, `2587`, `2604`) appellent `recordListingShare` **inconditionnellement** juste après.

### 2. L'activation utilisateur est consommée par un `await fetch` avant `navigator.share`
`App/features/post/post-flow-controller.mjs:261-276` — `await fetchFn(effectiveImageUrl)` puis `await response.blob()` puis `navigatorObject.share(...)`. WebKit exige une activation transitoire pour `share()` ; télécharger un PNG 1080×1920 (`compose-story-image.ts:21,32`) sur une connexion 3G RDC la fait expirer → `NotAllowedError`, avalé par le `catch` du constat 1. Même défaut pour les `window.open` de `2413` et de `2433` : appelés après un `await`, ils sont candidats au blocage de pop-up. C'est la cause racine la plus probable des « ça ne fait rien » en production.

### 3. Presse-papiers : aucun retour, aucune gestion d'échec
- `App/app.js:2239-2248` — `handleListingLinkCopy` copie et ne dit **rien**. L'appelant `2559-2563` place `closeShareMenu()` **après** le `await` : si `writeText` rejette (contexte non sécurisé, permission Safari), le rejet part dans l'écouteur `async` non protégé de `2436`, la feuille reste ouverte et l'utilisateur n'a ni lien ni message.
- Le repli `window.prompt` ne couvre que « API absente », jamais « API en échec ».
- `2427-2429` — `void navigator.clipboard.writeText(...)` sans `.catch()` : rejet non géré, et l'UI enchaîne comme si la copie avait réussi.

### 4. Les textes de la feuille affirment des choses fausses
`App/components/share-menu.mjs:37-41` — « Le lien de l'annonce est partagé, avec son aperçu image » est faux pour Instagram et TikTok, où l'on copie un lien et ouvre un onglet (`2431-2433`). « L'image story est téléchargée » s'affiche dès la bascule en mode story, **y compris quand `storyImageUrl` est vide** — cas où `2543` retombe silencieusement sur `handleLinkFirstShare`. Par ailleurs `2317-2324` écrase l'`innerHTML` du bouton par « Lien copié » et le restaure 2 s plus tard sur une référence DOM que n'importe quel `renderApp` (`appRoot.innerHTML = …`, `1260`) aura détruite entre-temps.

### 5. Le compteur de partages est faux à l'intérieur et ouvert à l'extérieur
`App/app.js:2265-2275` → `apps/api/src/listings/listings.controller.ts:58-64` → `listings.service.ts:563-568`. `POST /listings/:slug/share` est public, sans session, sans idempotence, sans limitation de débit, et incrémente `shareCount` à chaque appel. Côté client il est déclenché après une annulation (constat 1). C'est exactement le type de métrique qui ne doit pas entrer dans un jeu de données présenté comme monétisable.

### 6. OG mono-marché alors que les deux marchés sont à égalité
`shared/listing-og.mjs:53` fige `og:locale` à `fr_CD`. `server.mjs:110-120` applique un repli `priceCurrency: 'CDF'`, `locationLabel: 'RDC'` à **toute** annonce dont l'appel API échoue — y compris belge. `listing-og.mjs:51` déclare `og:type: website` tout en émettant des `product:price:*` (`65-66`) que les crawlers ignorent hors `og:type=product`, et `product:price:amount` part vide quand le prix est nul. Enfin la page `/annonce/` est en `no-cache` (`server.mjs:291`) et refait un `fetchListing` à chaque passage de crawler avec `AbortSignal.timeout(2500)` (`122-131`), sans cache serveur — contrairement à `liveListingsCache`. Un pic de latence API fige donc chez Facebook un aperçu « Annonce Zwibba — RDC », que le cache FB conserve des semaines.

### 7. Le visuel story 9:16 est servi comme aperçu de lien
`shared/listing-og.mjs:36-70` — dès que `storyImageUrl` existe, il devient `og:image` avec `og:image:width/height = 1080×1920` **et** `twitter:card = summary_large_image`. Les aperçus de lien (WhatsApp, Facebook, Twitter) sont en 1.91:1 : un 9:16 est rogné au centre, donc le logo, le prix et le bandeau posés en haut et en bas par `compose-story-image.ts:74-85` disparaissent. Story et aperçu de lien sont deux formats, pas un.

### 8. La story n'est pas liée à la même « première photo » que l'app
`apps/api/src/share/story-image.service.ts:70-82` trie sur `sourcePresetId === 'capture'` puis `createdAt`, alors que le brouillon côté client ordonne sur `kind === 'primary'` (`post-flow-controller.mjs:312-319`). Rien ne garantit que la story reprenne la photo que le vendeur considère comme principale. Le prix y est de plus formaté `Intl.NumberFormat('fr-CD')` avec repli `CDF` (`story-image.service.ts:56-60`) alors que `shared/listing-og.mjs:14-31` sait rendre EUR et USD : une annonce belge sortira « 250 EUR » sur la story et « 250 € » dans l'OG. Enfin la génération est en *fire-and-forget* à l'approbation (`moderation.service.ts:413-418`) et le client abandonne son sondage après 5 essais / ~10 s (`app.js:1875-1913`) sans jamais afficher d'état « visuel en préparation ».

### 9. La modale de partage promet `aria-modal` et ne tient rien
`App/components/share-menu.mjs:44` déclare `role="dialog" aria-modal="true"`. Or : aucun focus n'est déplacé dans la feuille après le `appRoot.innerHTML = …` de `app.js:1260-1266` (le focus retombe sur `<body>`), aucun piège de focus, aucun `inert`/`aria-hidden` sur l'arrière-plan (Tab et lecteur d'écran continuent de parcourir la page), **aucun gestionnaire `Escape` dans tout `app.js`** (recherche `keydown` : zéro occurrence), et aucun retour du focus sur le déclencheur à la fermeture.

### 10. Détection de capacité incohérente entre mobile et desktop
`app.js:1268-1274` masque `[data-action="share-native"]` par `style.display` — sur le **premier** élément trouvé seulement — quand `canShareStoryImage()` est faux. Mais la feuille de partage, elle, affiche les cinq mêmes options quelle que soit la plateforme, et n'offre **jamais** le partage natif d'un simple lien (`navigator.share({url})`), pourtant disponible sur mobile même quand `canShare({files})` est faux. Accessoirement, `handleFacebookShare(listingUrl)` est appelé en `2585` sans son second paramètre `trigger`, ce qui rend mort le branchement natif de `2330-2336`.

---

# 2. Architecture minimale proposée (PWA, sans SDK)

**Règle unique dont tout le reste découle : aucune action nécessitant une activation utilisateur ne doit suivre un `await`.**

1. **Préchargement.** À l'ouverture de la feuille (`openShareMenu`), lancer le `fetch` du visuel story et conserver le `Blob` en mémoire dans `state.shareMenu`. Le clic sur une option appelle alors `navigator.share({files:[…]})` de façon synchrone. Trois états explicites : `preparing` / `ready` / `unavailable`, rendus dans la feuille.
2. **Trois chemins nommés honnêtement.**
   - « Partager… » — visible uniquement si `navigator.share` existe ; `share({url, text, title})` synchrone. C'est le chemin par défaut sur mobile, aujourd'hui absent du menu.
   - « WhatsApp » / « Facebook » — intention web ouverte **synchronement** (le chemin `post` actuel est déjà correct, ne pas le régresser).
   - « Instagram / TikTok » — **export manuel assumé** : bouton « Enregistrer le visuel » + bouton « Copier le texte », avec la limite écrite en clair (« Instagram et TikTok n'acceptent pas de lien depuis le web : enregistrez l'image et collez le texte dans l'application »). Aucune ouverture d'onglet automatique.
3. **Jamais de succès non prouvé.** Un message de confirmation n'apparaît que sur résolution effective de `share()` ou de `writeText()`. `AbortError` = fermeture silencieuse, pas de repli, pas de téléchargement, pas de comptage.
4. **Comptage.** Incrémenter uniquement sur résolution effective, distinguer *intention* et *partage confirmé* (le partage natif ne dit pas où), et rendre l'endpoint idempotent + limité en débit avant de le considérer comme une donnée.
5. **Deux visuels distincts.** `og:image` en 1200×630 dérivé de la photo principale ; le 1080×1920 réservé à l'export story. `og:locale` et devise par marché ; cache serveur des métadonnées d'annonce sur le modèle de `liveListingsCache`, avec un repli conscient du marché au lieu de « RDC / CDF ».
6. Aucun SDK Meta/TikTok, aucune publication automatique. Rien dans ce qui précède n'en requiert.

---

# 3. CGU et confidentialité — écarts avec le code réel

Je ne valide pas juridiquement ces textes et je ne peux pas le faire. Je relève uniquement ce qu'ils affirment et que le code contredit.

**Affirmations non conformes au code actuel :**

1. **Âge — CGU §4, « 18 ans accomplis ».** Aucun contrôle d'âge nulle part : ni champ, ni case, ni colonne (`App/features/auth/*`, `apps/api/src/auth/*`, `schema.prisma`). Le document promet une restriction que rien n'applique.
2. **Acceptation — CGU §2 et §14, confidentialité §12.** « En créant un compte, vous les acceptez », « la version qui vous est opposable est celle que vous avez acceptée, telle qu'enregistrée par nos soins avec son identifiant de version » : il n'existe **aucun** mécanisme d'acceptation. Aucun modèle de consentement dans `schema.prisma`, et **aucun lien vers les CGU ou la politique de confidentialité dans `App/` ni dans `src/site/`** (recherche vide). Le plan `consent-ledger` décrit exactement le dispositif manquant, et il n'est pas implémenté.
3. **Paiement interne — CGU §8.** Il n'existe aucun achat de jetons. Le seul crédit est `seedDemoWalletIfNeeded` (`auth.service.ts:129-162`) : 30 000 CDF « Crédit bêta », et uniquement si `otp.provider === 'demo'`. `WalletTransaction` et `BoostPurchase` ne connaissent que `amountCdf` — **pas d'EUR, donc rien de vendable en Belgique**. Un article sur les prix TTC et le droit de rétractation décrit un service qui n'existe pas ; le publier crée une obligation sans contrepartie technique.
4. **Couverture des marchés — CGU §2, « une version distincte s'applique aux utilisateurs situés en RDC ».** Cette version n'existe pas : seuls `terms.fr-BE.md` et `privacy.fr-BE.md` sont rédigés. Le site sert trois locales (`fr-cd`, `fr-be`, `nl-be`) : six textes attendus, deux écrits. Avec deux marchés à égalité, c'est bloquant.
5. **« Les analyses agrégées ne permettent d'identifier ni vous ni votre annonce » — confidentialité §4.** Vrai pour `SearchQueryEvent` (aucun identifiant utilisateur, vérifié `schema.prisma:309-319`) — mais `rawQuery` est stocké en texte brut, ce qu'un utilisateur peut remplir de son nom ou de son numéro. Et c'est **faux pour `ListingPriceEvent`** (`schema.prisma:322-334`), qui porte `draftId` et `listingId`, donc remonte à `Draft.ownerPhoneNumber` (`schema.prisma:51`), un identifiant personnel direct. La phrase telle qu'écrite ne tient pas.
6. **Modération — CGU §9.** `ModerationDecision` et les motifs existent côté API, mais je n'ai trouvé **aucun canal de notification à l'utilisateur ni voie de recours** dans le code (recherche `notif|appeal|recours|contest` sur `apps/api/src/moderation`, `listings`, `App/features/listings` : zéro résultat). L'engagement DSA est écrit, l'outil n'existe pas.
7. **Durées de conservation et droits — confidentialité §8 et §9.** Aucune purge automatique n'existe (messages à 24 mois, codes à 24 h : aucun job). Aucun endpoint d'effacement ni de portabilité — le plan les place explicitement en non-goals. Annoncer une réponse sous un mois sans outil est un engagement non tenu.

**Conformes, à conserver :** la licence §6 couvrant « les visuels de partage générés automatiquement » correspond bien à `story-image.service.ts` ; les sous-traitants listés (Cloudflare R2, Google Gemini/Vision, Meta WhatsApp) sont tous vérifiables dans le code. Il manque Cloudflare en tant que proxy/CDN du site.

**Décisions à obtenir de vous (je n'invente rien) :**

1. **Identité juridique de l'exploitant** : dénomination, forme, siège, BCE, TVA, adresse de contact, point de contact DSA. Toutes les mentions `[[…]]` en dépendent.
2. **Âge minimum** retenu et façon de l'appliquer (attestation à l'inscription ou rien — mais alors retirer la clause).
3. **Pays et droit applicable** : deux jeux complets de documents, RDC sous l'ordonnance-loi 23/010, et la juridiction associée.
4. **Paiement** : y aura-t-il un achat réel de jetons ? Dans quelle devise par marché, par quel prestataire ? Tant que non, le §8 doit disparaître ou être marqué comme non encore actif.
5. **Licence sur les contenus** : durée, caractère sous-licenciable, usage promotionnel sur réseaux sociaux, réutilisation des visuels story par Zwibba.
6. **Données / IA / modération / consentement** : durée de conservation réelle des photos envoyées à Gemini et Vision, finalités soumises à consentement, contenu exact du futur score vendeur, et qui notifie une décision de modération, sous quel délai, avec quelle voie de recours.

---

# 4. Accord motivé sur la direction

**Je suis d'accord, avec une réserve de séquencement.**

Sur le fond : oui. Des documents calés sur le fonctionnement réel plutôt que sur un fonctionnement souhaité, versionnés et traçables, avec l'**acceptation contractuelle distinguée du consentement facultatif**, est la seule forme qui survit à un audit — et c'est aussi ce qui protège la valeur du jeu de données, puisqu'un consentement obtenu en conditionnant l'accès au service est nul et emporterait avec lui les lignes qu'il devait autoriser. Sur le partage : oui également, et pour une raison technique et non cosmétique — les trois défauts les plus graves (constats 1, 2, 3) sont tous des variantes du même geste, à savoir agir après un `await` puis maquiller l'échec en succès. Partage natif prioritaire, lien robuste, exports story manuels assumés, aucun faux message de succès, annulation respectée : c'est la conclusion à laquelle mène le code lui-même.

Ma réserve porte sur l'ordre. Publier des CGU aujourd'hui exposerait à des engagements que le code ne peut pas tenir : rétractation sur un achat qui n'existe pas, notification de modération sans canal, effacement sans endpoint, âge minimum sans contrôle. Deux voies possibles, et le choix vous revient : soit on **réduit les textes à ce que le produit fait réellement** et on les publie vite, soit on implémente d'abord le socle (registre de consentement, âge, notification de modération) et on publie les textes complets ensuite. Je recommande la première, parce qu'elle est honnête immédiatement et qu'elle se complète par versions successives — ce que le mécanisme de versionnement rend précisément possible.

Deux points que je durcis par rapport à la direction proposée : la parité RDC/Belgique doit être traitée comme bloquante et non comme une traduction ultérieure (six textes, pas deux) ; et la phrase de la politique de confidentialité sur le caractère non identifiant des analyses agrégées doit être corrigée avant publication, parce que `ListingPriceEvent` la contredit dans le schéma actuel.

Aucune action engagée. Dites-moi laquelle des deux voies vous retenez et je prépare la paire design + implémentation correspondante.