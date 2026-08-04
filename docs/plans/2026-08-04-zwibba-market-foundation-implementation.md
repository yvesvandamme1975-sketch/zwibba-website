# Zwibba Market Foundation (Multi-Pays CD/BE) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Comptes, annonces, feed, devises et modération scopés par pays (`CD`/`BE`), inscription `+32` acceptée via l'OTP WhatsApp existant.

**Architecture:** Nouveau résolveur `apps/api/src/auth/phone-country.ts` (miroir App `App/utils/phone-country.mjs`), colonne `countryCode` (défaut `'CD'`) sur `User`/`Draft`/`Listing`, `EUR` dans `price-validation.ts` avec règle devise-par-marché, filtres `countryCode` sur `listBrowseFeed()` et `listQueue()`, villes belges seedées dans `LocationOption`.

**Tech Stack:** NestJS 11, Prisma 6, node:test (runner `apps/api/scripts/run-tests.mjs` côté API, `node --test tests/*.test.mjs` côté App), vanilla JS ESM.

---

### Task 1: Indexer la paire de plans

**Files:**
- Modify: `docs/plans/README.md`

1. Ajouter les deux noms de fichiers (`2026-08-04-zwibba-market-foundation-design.md` / `-implementation.md`) à la fin de la liste de `docs/plans/README.md`, même format que les entrées existantes.
2. Vérifier : `grep market-foundation docs/plans/README.md` → les deux lignes apparaissent.
3. Commit : `git commit -m "docs: index market-foundation plans"`

### Task 2: Module phone-country (API)

**Files:**
- Create: `apps/api/src/auth/phone-country.ts`
- Test: `apps/api/test/auth/phone-country.test.ts`

1. Écrire le test qui échoue :

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeMarketCountryCode,
  resolvePhoneCountry,
} from '../../src/auth/phone-country';

test('resolvePhoneCountry maps +243 numbers to CD', () => {
  assert.equal(resolvePhoneCountry('+243990000001'), 'CD');
});

test('resolvePhoneCountry maps +32 numbers to BE', () => {
  assert.equal(resolvePhoneCountry(' +32499000001 '), 'BE');
});

test('resolvePhoneCountry rejects other prefixes', () => {
  assert.equal(resolvePhoneCountry('+33612345678'), null);
  assert.equal(resolvePhoneCountry('0499000001'), null);
});

test('normalizeMarketCountryCode falls back to CD', () => {
  assert.equal(normalizeMarketCountryCode('BE'), 'BE');
  assert.equal(normalizeMarketCountryCode('be'), 'CD');
  assert.equal(normalizeMarketCountryCode(undefined), 'CD');
});
```

2. Lancer `cd apps/api && npm test` → FAIL (module introuvable).
3. Implémenter :

```ts
export type MarketCountryCode = 'BE' | 'CD';

export const SUPPORTED_MARKET_COUNTRY_CODES: readonly MarketCountryCode[] = [
  'BE',
  'CD',
];

const callingCodeByCountry: Record<MarketCountryCode, string> = {
  BE: '+32',
  CD: '+243',
};

export function resolvePhoneCountry(
  phoneNumber: string,
): MarketCountryCode | null {
  const normalizedPhone = phoneNumber.trim();

  for (const countryCode of SUPPORTED_MARKET_COUNTRY_CODES) {
    if (normalizedPhone.startsWith(callingCodeByCountry[countryCode])) {
      return countryCode;
    }
  }

  return null;
}

export function normalizeMarketCountryCode(value: unknown): MarketCountryCode {
  if (value === 'BE' || value === 'CD') {
    return value;
  }

  return 'CD';
}
```

4. `cd apps/api && npm test` → PASS.
5. Commit : `git commit -m "feat(auth): add market phone country resolution"`

### Task 3: Migration Prisma countryCode

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260804090000_market_country_code/migration.sql`

1. Dans `schema.prisma`, ajouter `countryCode String @default("CD")` aux modèles `User`, `Draft` et `Listing`, et ajouter `@@index([countryCode])` à `Listing` (à côté des index existants).
2. Créer la migration :

```sql
ALTER TABLE "User" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'CD';
ALTER TABLE "Draft" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'CD';
ALTER TABLE "Listing" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'CD';
CREATE INDEX "Listing_countryCode_idx" ON "Listing"("countryCode");
```

3. Vérifier : `cd apps/api && npx prisma validate` → « The schema … is valid ». Puis `npx prisma format --check` si disponible, sinon relire le diff.
4. Commit : `git commit -m "feat(db): add countryCode to user, draft and listing"`

### Task 4: Auth — accepter +32 et persister le pays

**Files:**
- Modify: `apps/api/src/auth/auth.service.ts` (garde `+243` dans `requestOtp`, upsert dans `verifyOtp`)
- Test: `apps/api/test/auth/auth-service.test.ts`

1. Ajouter au test existant (mêmes patterns `setDemoEnv`/fakes que le fichier) :

```ts
test('requestOtp rejects unsupported prefixes with the bilingual message', async () => {
  // fake OtpService jamais appelé ; assert BadRequestException
  // message: 'Le numéro doit commencer par +243 ou +32.'
  await assert.rejects(
    () => service.requestOtp('+33612345678'),
    (error: Error) => error.message === 'Le numéro doit commencer par +243 ou +32.',
  );
});

test('verifyOtp stores the resolved countryCode on the user upsert', async () => {
  // FakePrisma capture l'argument upsert ; vérifier
  // create.countryCode === 'BE' et update.countryCode === 'BE'
  await service.verifyOtp({ code: '123456', phoneNumber: '+32499000001' });
  assert.equal(capturedUpsert.create.countryCode, 'BE');
  assert.equal(capturedUpsert.update.countryCode, 'BE');
});
```

(Adapter les fakes existants du fichier : le `FakePrisma` doit capturer l'appel `user.upsert` ; le fake `OtpService` renvoie `{ sid, status: 'approved' }`.)

2. `cd apps/api && npm test` → FAIL (message actuel `+243` seul, pas de countryCode).
3. Implémenter dans `requestOtp` (remplace le bloc `startsWith('+243')`) :

```ts
if (!resolvePhoneCountry(normalizedPhone)) {
  throw new BadRequestException('Le numéro doit commencer par +243 ou +32.');
}
```

et dans `verifyOtp` :

```ts
const phoneCountry = resolvePhoneCountry(normalizedPhone) ?? 'CD';
const user = await this.prismaService.user.upsert({
  where: { phoneNumber: normalizedPhone },
  update: { countryCode: phoneCountry },
  create: { phoneNumber: normalizedPhone, countryCode: phoneCountry },
});
```

(import `resolvePhoneCountry` depuis `./phone-country`.)

4. `cd apps/api && npm test` → PASS (y compris les specs e2e demo existantes, qui restent en `+243`).
5. Commit : `git commit -m "feat(auth): accept belgian numbers and persist user country"`

### Task 5: EUR dans price-validation

**Files:**
- Modify: `apps/api/src/common/price-validation.ts`
- Test: `apps/api/test/common/price-validation.test.ts` (compléter le fichier existant, ou le créer s'il n'existe pas)

1. Tests :

```ts
test('normalizeListingPriceCurrency accepts EUR', () => {
  assert.equal(normalizeListingPriceCurrency('EUR'), 'EUR');
});

test('formatListingPrice renders EUR with the euro suffix', () => {
  assert.equal(
    formatListingPrice({ priceAmount: 250, priceCurrency: 'EUR' }),
    '250 €',
  );
});

test('listingCurrenciesForCountry scopes currencies per market', () => {
  assert.deepEqual(listingCurrenciesForCountry('CD'), ['CDF', 'USD']);
  assert.deepEqual(listingCurrenciesForCountry('BE'), ['EUR']);
});
```

2. `cd apps/api && npm test` → FAIL.
3. Implémenter : `ListingPriceCurrency = 'CDF' | 'USD' | 'EUR'` ; `normalizeListingPriceCurrency` accepte `'EUR'` ; dans `formatListingPrice`, `const suffix = priceCurrency === 'USD' ? 'US$' : priceCurrency === 'EUR' ? '€' : 'CDF';` ; et :

```ts
import type { MarketCountryCode } from '../auth/phone-country';

export function listingCurrenciesForCountry(
  countryCode: MarketCountryCode,
): ListingPriceCurrency[] {
  return countryCode === 'BE' ? ['EUR'] : ['CDF', 'USD'];
}
```

4. `cd apps/api && npm test` → PASS.
5. Commit : `git commit -m "feat(listings): support EUR listing prices per market"`

### Task 6: Propagation Draft → Listing + devise du marché

**Files:**
- Modify: `apps/api/src/drafts/drafts.service.ts` (`syncDraft`, branches create et update)
- Modify: `apps/api/src/moderation/moderation.service.ts` (`publish`, `listing.upsert` create + update)
- Test: `apps/api/test/moderation/` (spec publish existante) et `apps/api/test/drafts/`

1. Tests : dans la spec drafts, vérifier que le record créé porte `countryCode: 'BE'` quand `phoneNumber` commence par `+32` ; dans la spec publish, vérifier (a) que le listing upserté copie `countryCode` du draft, (b) qu'un draft `BE` avec `priceCurrency: 'CDF'` est rejeté en `BadRequestException` avec le message `'Devise non disponible pour ce marché.'`.
2. `cd apps/api && npm test` → FAIL.
3. Implémenter :
   - `drafts.service.ts` : ajouter `countryCode: resolvePhoneCountry(phoneNumber) ?? 'CD'` aux objets `data` des deux branches (`draft.create` et la branche update).
   - `moderation.service.ts`, dans `publish` après le chargement de `syncedDraft` :

```ts
const draftCountry = normalizeMarketCountryCode(syncedDraft.countryCode);

if (!listingCurrenciesForCountry(draftCountry).includes(supportedPrice.priceCurrency)) {
  throw new BadRequestException('Devise non disponible pour ce marché.');
}
```

   puis ajouter `countryCode: draftCountry` aux blocs `create` et `update` du `transaction.listing.upsert` (ligne ~253).
4. `cd apps/api && npm test` → PASS.
5. Commit : `git commit -m "feat(listings): propagate market country from draft to listing"`

### Task 7: Feed filtré par pays

**Files:**
- Modify: `apps/api/src/listings/listings.service.ts` (`listBrowseFeed`, ligne ~381)
- Modify: `apps/api/src/listings/listings.controller.ts` (`@Get()`)
- Test: `apps/api/test/listings/` (spec browse feed existante)

1. Test : avec un fake Prisma contenant un listing `CD` et un listing `BE` approuvés, `listBrowseFeed({ countryCode: 'BE' })` ne renvoie que le listing `BE` ; sans argument, seulement le `CD`.
2. `cd apps/api && npm test` → FAIL.
3. Implémenter :

```ts
async listBrowseFeed({ countryCode = 'CD' }: { countryCode?: MarketCountryCode } = {}) {
  const listings = await this.prismaService.listing.findMany({
    where: { moderationStatus: 'approved', countryCode },
  });
  // … reste inchangé
}
```

Contrôleur (ajouter `Query` à l'import `@nestjs/common`) :

```ts
@Get()
listBrowseFeed(@Query('countryCode') countryCode?: string) {
  return this.listingsService.listBrowseFeed({
    countryCode: normalizeMarketCountryCode(countryCode),
  });
}
```

4. `cd apps/api && npm test` → PASS.
5. Commit : `git commit -m "feat(listings): scope browse feed by market country"`

### Task 8: Files de modération séparées

**Files:**
- Modify: `apps/api/src/moderation/moderation.service.ts` (`listQueue`, ligne ~328) + le contrôleur exposant `/moderation/queue`
- Modify: `apps/admin/src/server.ts` (fetch ligne ~58 + lien nav) et `apps/admin/src/moderation/moderation-page.ts` (onglets)
- Test: `apps/api/test/moderation/` + tests admin existants

1. Test API : `listQueue({ countryCode: 'BE' })` ne renvoie que les décisions dont `listing.countryCode === 'BE'`.
2. `cd apps/api && npm test` → FAIL.
3. Implémenter côté API :

```ts
async listQueue({ countryCode }: { countryCode: MarketCountryCode }) {
  const decisions = await this.prismaService.moderationDecision.findMany({
    where: {
      status: 'pending_manual_review',
      listing: { countryCode },
    },
    include: { listing: true },
  });
  // … mapping inchangé
}
```

Le contrôleur lit `@Query('countryCode')` et applique `normalizeMarketCountryCode`. Côté admin : `server.ts` lit `countryCode` dans l'URL de la page (`/moderation?countryCode=BE`, défaut `CD`), le propage au fetch (`${apiBaseUrl}/moderation/queue?countryCode=${countryCode}`), et `moderation-page.ts` rend deux onglets « RDC » / « Belgique » (liens `?countryCode=CD|BE`, actif souligné) — deux files entièrement séparées.
4. `cd apps/api && npm test` puis `cd apps/admin && npm test` → PASS.
5. Commit : `git commit -m "feat(moderation): separate moderation queues per market"`

### Task 9: Villes belges + validation profil par pays

**Files:**
- Modify: `apps/api/src/locations/system-seeded-cities.ts`
- Modify: `apps/api/src/profile/profile.service.ts` (ligne ~133)
- Test: `apps/api/test/locations/` + `apps/api/test/profile/`

1. Tests : `buildSystemSeededCities()` contient `{ countryCode: 'BE', label: 'Bruxelles', … }` et toujours les 15 villes `CD` ; la mise à jour de zone d'un utilisateur `+32…` valide contre `countryCode: 'BE'`.
2. `cd apps/api && npm test` → FAIL.
3. Implémenter : dans `system-seeded-cities.ts`, ajouter

```ts
const rawBelgianCities = [
  'Bruxelles', 'Anvers', 'Gand', 'Charleroi', 'Liège',
  'Bruges', 'Namur', 'Louvain', 'Mons', 'Malines',
  'La Louvière', 'Courtrai', 'Hasselt', 'Ostende', 'Tournai',
];
```

et faire retourner `buildSystemSeededCities()` la concaténation des deux listes (mapper `rawBelgianCities` avec `countryCode: 'BE'`, mêmes autres champs). Dans `profile.service.ts`, remplacer `countryCode: 'CD'` par `countryCode: resolvePhoneCountry(session.phoneNumber) ?? 'CD'`.
4. `cd apps/api && npm test` → PASS. Le seed s'appliquera en production via le script `seed-location-options` existant (idempotent, upsert).
5. Commit : `git commit -m "feat(locations): seed belgian cities and scope profile area by country"`

### Task 10: App — pays dérivé de la session

**Files:**
- Create: `App/utils/phone-country.mjs`
- Modify: `App/app.js` (appels `countryCode: 'CD'` lignes ~860 et ~1689)
- Test: `tests/phone-country.test.mjs`

1. Test (`node --test tests/phone-country.test.mjs`) :

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePhoneCountry } from '../App/utils/phone-country.mjs';

test('maps +243 to CD, +32 to BE, defaults to CD', () => {
  assert.equal(resolvePhoneCountry('+243990000001'), 'CD');
  assert.equal(resolvePhoneCountry('+32499000001'), 'BE');
  assert.equal(resolvePhoneCountry(undefined), 'CD');
});
```

2. FAIL (module introuvable).
3. Implémenter `App/utils/phone-country.mjs` :

```js
export function resolvePhoneCountry(phoneNumber) {
  const normalized = typeof phoneNumber === 'string' ? phoneNumber.trim() : '';

  if (normalized.startsWith('+32')) {
    return 'BE';
  }

  return 'CD';
}
```

Dans `App/app.js`, importer le module et remplacer les deux `countryCode: 'CD'` par `countryCode: resolvePhoneCountry(state.session?.phoneNumber)`.
4. `node --check App/app.js && node --test tests/phone-country.test.mjs && node scripts/build.mjs` → PASS.
5. Commit : `git commit -m "feat(app): derive city country from session phone number"`

### Task 11: .env.example à jour + vérification finale

**Files:**
- Modify: `apps/api/.env.example` (lignes 15-18, bloc Twilio périmé)

1. Remplacer le bloc Twilio par les variables réelles de `env.ts` :

```
OTP_PROVIDER=demo
DEMO_OTP_ALLOWLIST=+243990000001
DEMO_OTP_CODE=123456
META_WHATSAPP_PHONE_NUMBER_ID=
META_WHATSAPP_ACCESS_TOKEN=
META_WHATSAPP_TEMPLATE_NAME=zwibba_auth_code
META_WHATSAPP_TEMPLATE_LANG=fr
META_GRAPH_API_VERSION=v21.0
```

(Reprendre les noms/valeurs par défaut exacts de `apps/api/src/config/env.ts` — ne rien inventer.)
2. Vérification finale complète : `cd apps/api && npm test`, puis à la racine `npm run build`, `npm run smoke:monorepo` → tout PASS, citer les sorties.
3. Commit : `git commit -m "chore(api): refresh env example for meta otp provider"`
