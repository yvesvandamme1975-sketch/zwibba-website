# Vérification du partage — 7 septembre 2026

Cadrage approuvé par Yves, branche codex/cgu-modern-sharing. Résultat de livraison et SHA final à compléter après CI/déploiement.

## Vérifications

- 389 tests API et 12 tests admin passent. Build TypeScript API passe.
- 486 tests web passent après correction de revue, avec build et smoke:production-contracts.
- Recette Chromium à 390px et 1280px, données et API de partage simulées : annulation, presse-papiers refusé avec texte sélectionnable, instructions Instagram/TikTok, focus dans le dialogue, Tab/Shift+Tab, Échap et retour au déclencheur.
- Captures vérifiées hors animation. PNG paysage de test généré et inspecté : 1200x630. La fixture photo des tests est grise, pas une annonce réelle.
- Migration produite par Prisma migrate diff : unique colonne nullable Listing.shareImageUrl ; aucun effacement ou changement des valeurs existantes.
- Les anciennes attentes de tests ont été modifiées explicitement : aperçu paysage remplace story, 404 remplace faux fallback 200, payload API expose countryCode/shareImageUrl.
- Anciennes fiches HTML générées : ajout d’un test démontrant qu’elles masquaient la suppression d’une annonce ; le serveur consulte désormais l’état API aussi pour ces routes. Les anciennes URLs belges sont redirigées vers la fiche canonique.

## Limites et décisions

La résolution de Web Share indique uniquement le transfert au mécanisme de partage, pas une publication sociale confirmée. Le parcours n’alimente plus shareCount : ses anciennes données sont non fiables. L’endpoint historique reste compatible avec les anciens clients ; il ne doit pas être utilisé comme preuve de performance ou de publication. Cette décision est explicite dans le design, contrairement à l’interprétation du relecteur ci-dessous. Une future métrique d’actions devra porter des noms distincts et ses protections propres.

Les annonces sans shareImageUrl utilisent leur photo réelle, sans fausse dimension ni URL inventée. Une régénération contrôlée des annonces publiques est à examiner au déploiement. Pas de mutation massive cachée. Les caches propres aux réseaux ne peuvent pas être invalidés par cette modification.

La recette navigateur ne valide pas une feuille native sur un iPhone réel ni la publication dans WhatsApp/Instagram/TikTok. Il faut confirmer ces derniers gestes avec Yves. Aucun partage externe réel n’a été émis pendant les tests.

## Revue Claude et traitement

Les observations 1, 3, 4, 5 et 6 ont été reproduites ou vérifiées puis corrigées : slug conservé sur 503, région d’annonce persistante hors du rendu, focus restauré, course entre préparations protégée par l’identité du contrôleur AbortController, fixtures localhost admises, instructions adaptées à une image absente. De nouveaux tests reproduisaient la perte du focus, la course, le blocage localhost et la perte du slug avant correction.

La proposition 2 de réincrémenter shareCount pour copie/ouverture/téléchargement n’est pas retenue : elle réintroduirait une métrique ambiguë que le design supprime explicitement. Le contrôle du marché BE reste dans la recette de livraison ; aucune donnée métier n’est corrigée par simple déduction de devise.

### Rapport original de revue (avant corrections)

Read-only review complete (13 inspection calls, no mutations).

## Findings, highest impact first

**1. `server.mjs` — 503 on a slow API turns every shared link into a dead end for humans** (blocking)
`server.mjs` catch block in the dynamic `/annonce/<slug>/` branch (added at the hunk replacing `buildFallbackListing`, ~lines 264‑276). Previously an API hiccup still served `renderDynamicListingPage`, whose `<script>location.replace('/App/#listing/<slug>')</script>` (`server.mjs:205`) landed the visitor on the listing inside the PWA, where the client-side fetch usually succeeded. Now any transient failure inside the 2.5 s `AbortSignal.timeout` (`server.mjs:113`) returns a static page whose only link is `/App/` — the slug is lost. This is the single most important entry point for the whole sharing feature, and the 503 branch is by definition the transient one.
Fix: keep the 503 + `noindex` + `Retry-After` (that part is a real improvement over the old fake-OG fallback that Facebook caches for ~30 days), but add `<script>location.replace("/App/#listing/<encoded slug>")</script>` to the **503** body only. Leave 404 as the hard stop it is.

**2. `App/app.js` — share tracking silently removed** (blocking-ish, data loss)
`recordListingShare` and all five of its call sites were deleted; nothing replaces them. `POST /listings/:slug/share` still exists (`apps/api/src/listings/listings.controller.ts:58`) and still increments (`listings.service.ts:572`), and `shareCount` is still served in the detail payload (`listings.service.ts:338`) — it will now stay at 0 forever. This is a real behaviour regression that no test covers, not a deliberate simplification I can see documented.
Fix: in the `shareActions` dispatch (`App/app.js:2418-2421`), fire the POST when `perform()` returns `handed-off` / `copied` / `opened` / `download-requested`, deduped once per open via `shareReturnTarget`.

**3. `App/components/share-menu.mjs:63` + `App/app.js:1238,~1300` — the status message is very unlikely to be announced, and focus never returns to the pressed control** (a11y, medium)
`renderApp()` rewrites `appRoot.innerHTML` on every controller change, so the `<p role="status" aria-live="polite">` is a *brand-new node* each time. A live region inserted into the DOM already containing its text is generally not announced by NVDA/VoiceOver — so "Lien copié.", the manual-copy fallback, and every error string are visually correct but silent. Compounding it: while `busy` is true every option button is `disabled`, so `syncShareFocus` falls through to `focusable[0]` = "Fermer"; on the next render `previousAction` is now `close-share-menu`, so focus stays on "Fermer" after *every* action instead of returning to the button pressed.
Fix: after render, when `menu.message` is non-empty, set the status node's `textContent` in a `requestAnimationFrame` (or keep the status node outside the re-rendered subtree). And exclude `close-share-menu` from `previousAction` capture so focus returns to the originating action once it re-enables.

**4. `App/services/listing-share.mjs:66-74` — a superseded `prepareImage` clobbers the newer one**
The `catch` only guards `state !== current`. Clicking "Réessayer de préparer l'image" (or `open()` → `prepareImage()` racing) aborts the in-flight run *on the same state object*, so the stale run's `AbortError` handler still sets `preparedFile = null`, `canShareImage = false`, `imageStatus = 'unavailable'` and calls `changed()`. Best case a visible flicker to "indisponible"; if the new run resolves first, it nulls a genuinely prepared `File` and the "Partager l'image…" button disappears with no way back except another retry.
Fix: `if (state !== current || preparationAbort !== abort) return;` in both the success guard (line 60 already covers most of it) and the catch.

**5. `App/services/listing-share.mjs:53` — story image can never be prepared outside HTTPS**
`if (imageUrl.protocol !== 'https:') throw` is resolved against `baseUrl = window.location.origin`. Correct in production (R2 absolute URLs), but on `http://localhost` any relative story URL is permanently "unavailable", so story mode can't be exercised locally. Low, but it will read as a bug to whoever tests next.
Fix: allow `http:` when the resolved host is localhost/127.0.0.1.

**6. `App/services/listing-share.mjs:127-130` — Instagram/TikTok instructions assume an image that may not exist**
The action unconditionally switches to story mode and says "Enregistrez l'image et copiez la légende", even when `imageStatus === 'unavailable'` or `storyImageUrl` is empty — in which case no save button is rendered. Low; branch the copy on `imageStatus`.

## Not defects, but release steps

- **Backfill.** The migration is correctly additive (`20260907143000_listing_share_image`, single nullable column, no default, no rewrite — safe). But every existing listing has `shareImageUrl = null`, so `buildListingOgTags` (`shared/listing-og.mjs:37`) falls back to the raw `primaryImageUrl` — often portrait, no `og:image:width/height` — a *worse* card than the 1080×1920 story it used to emit. `regenerateStory` (`apps/api/src/moderation/moderation.service.ts:427`) already writes both buffers and restores `updatedAt`, so a bulk regeneration run after deploy is the fix. Treat it as part of the release, not a follow-up.
- **`countryCode` fallback is dead code.** `Listing.countryCode` is `String @default("CD")` (`schema.prisma:96`), so `listing.countryCode ?? (priceCurrency === 'EUR' ? 'BE' : 'CD')` (`listings.service.ts:272,341`) never takes the right branch, and the same is true of the `!countryCode && EUR` path in `listing-og.mjs:35`. Any Belgian listing whose row kept the `"CD"` default will be advertised as `fr_CD` / "RDC". Worth verifying the 3 live BE rows before shipping — it's a data check, not a code change.

## Things I checked and found sound

`openWindow`'s `about:blank` + `opener = null` + `location.replace` is correct and, importantly, still runs inside the user-activation task — no `await` executes before the share dispatch in the click handler (`App/app.js:2317-2421`). `escapeAttribute(boolean)` is safe (`App/utils/rendering.mjs:10` → `String(value)`). The inert save/restore in `closeShareMenu` is ordered after `renderApp()` but only ever mis-restores already-detached nodes, so it's harmless. No orphaned `share-listing` / `share-native` buttons remain in `App/features`. `send()` accepts the 4-arg form used by the new error path. The `AbortError` → `cancelled` path correctly avoids showing an error when the user dismisses the OS sheet, and the code is right that native completion is handoff only — nothing in the diff claims otherwise.

## Verdict

**Not ready to ship as-is.** Findings 1 and 2 are behaviour regressions against the current trunk, both with small, contained fixes; finding 3 undermines the stated purpose of the redesign for assistive-tech users. Findings 4-6 are cheap enough to fold into the same pass. Add the `shareImageUrl` backfill run and the BE `countryCode` data check to the release checklist. With 1-4 fixed and the backfill executed, I'd call it ready.

I did not assess the CGU/legal side — operator identity is still outstanding, as you instructed.
