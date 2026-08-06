# Zwibba WhatsApp Contact (P3) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bouton WhatsApp vendeur (numéro du vendeur, message prérempli) sur le détail d'annonce + numéros de support par marché configurés par env (`ZWIBBA_SUPPORT_WHATSAPP_CD`/`_BE`), exposés dans l'App (profil) et sur la page contact vitrine, masqués quand absents.

**Architecture:** Helper pur `App/utils/whatsapp-link.mjs` ; `case 'whatsapp'` dans `renderContactAction` (`listing-detail-screen.mjs`) ; injection build-time `window.ZWIBBA_SUPPORT_WHATSAPP` par `scripts/build.mjs` (pattern `ZWIBBA_API_BASE_URL`) + bloc WhatsApp sur `renderContactPage` ; lien support dans l'écran profil scoped par `resolveBrowseCountry()`.

**Tech Stack:** Vanilla JS ESM, node:test (`node --test tests/*.test.mjs`).

---

### Task 1: Indexer la paire de plans

**Files:**
- Modify: `docs/plans/README.md`

1. Ajouter `2026-08-06-zwibba-whatsapp-contact-design.md` / `-implementation.md` à la fin de la liste (les deux fichiers existent, non commités — les inclure dans le commit).
2. Vérifier : `grep whatsapp-contact docs/plans/README.md` → deux lignes.
3. Commit : `git commit -m "docs: index whatsapp-contact plans"`

### Task 2: Helper wa.me

**Files:**
- Create: `App/utils/whatsapp-link.mjs`
- Test: `tests/whatsapp-link.test.mjs`

1. Test qui échoue :

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWhatsAppChatLink } from '../App/utils/whatsapp-link.mjs';

test('builds a wa.me link from an E.164 number with prefilled text', () => {
  assert.equal(
    buildWhatsAppChatLink('+243 990 000 001', 'Bonjour'),
    'https://wa.me/243990000001?text=Bonjour',
  );
});

test('encodes the prefilled text', () => {
  assert.equal(
    buildWhatsAppChatLink('+32499000001', 'Bonjour, ça va ?'),
    `https://wa.me/32499000001?text=${encodeURIComponent('Bonjour, ça va ?')}`,
  );
});

test('omits the text parameter when empty and rejects empty numbers', () => {
  assert.equal(buildWhatsAppChatLink('+243990000001'), 'https://wa.me/243990000001');
  assert.equal(buildWhatsAppChatLink(''), null);
  assert.equal(buildWhatsAppChatLink('   '), null);
  assert.equal(buildWhatsAppChatLink(undefined), null);
});
```

2. `node --test tests/whatsapp-link.test.mjs` → FAIL.
3. Implémenter :

```js
export function buildWhatsAppChatLink(phoneNumber, text = '') {
  const digits = typeof phoneNumber === 'string' ? phoneNumber.replace(/\D/g, '') : '';

  if (!digits) {
    return null;
  }

  const baseUrl = `https://wa.me/${digits}`;

  return text ? `${baseUrl}?text=${encodeURIComponent(text)}` : baseUrl;
}
```

4. `node --test tests/*.test.mjs` → 343 PASS (340 + 3).
5. Commit : `git commit -m "feat(app): add whatsapp chat link helper"`

### Task 3: Bouton WhatsApp vendeur

**Files:**
- Modify: `App/features/listings/listing-detail-screen.mjs` (`renderContactAction` + l'appelant qui liste les actions rendues)
- Modify: `App/app.css` si une variante de style est nécessaire (réutiliser `app-flow__button--secondary` sinon)
- Test: le test existant du détail d'annonce (grep `listing-detail` dans `tests/`)

1. Tests qui échouent : le rendu du détail pour un acheteur avec `contactPhoneNumber: '+243990000001'` et titre `Vélo` contient `https://wa.me/243990000001?text=` avec le texte encodé « Bonjour, votre annonce « Vélo » sur Zwibba m'intéresse. » et `data-testid` ou classe identifiable ; pour un propriétaire (contactPhoneNumber vide), aucun lien `wa.me` vendeur.
2. `node --test tests/*.test.mjs` → FAIL.
3. Implémenter : importer `buildWhatsAppChatLink` ; nouveau `case 'whatsapp':` dans `renderContactAction` —

```js
case 'whatsapp': {
  const chatLink = buildWhatsAppChatLink(
    detail.contactPhoneNumber,
    `Bonjour, votre annonce « ${detail.title} » sur Zwibba m'intéresse.`,
  );

  if (!chatLink) {
    return '';
  }

  return `
    <a
      class="app-flow__button app-flow__button--secondary"
      href="${escapeAttribute(chatLink)}"
      target="_blank"
      rel="noreferrer"
    >
      WhatsApp
    </a>
  `;
}
```

et insérer `'whatsapp'` dans la liste des actions rendues, entre `'message'` et `'call'`. (Le texte est construit AVANT échappement d'attribut — `escapeAttribute` sur l'URL complète, comme les autres liens du fichier.)
4. `node --test tests/*.test.mjs` → PASS ; `node scripts/build.mjs` → exit 0.
5. Commit : `git commit -m "feat(app): add whatsapp contact button on listing detail"`

### Task 4: Numéros de support par marché

**Files:**
- Modify: `scripts/build.mjs` (lecture env, injection `window.ZWIBBA_SUPPORT_WHATSAPP`, bloc WhatsApp sur la page contact)
- Modify: l'écran profil de l'App (`App/features/profile/`, fonction de rendu principale) + son appelant dans `App/app.js`
- Test: `tests/support-whatsapp.test.mjs` (nouveau) + le test existant de l'écran profil

1. Tests qui échouent :
   (a) `scripts/build.mjs` exporte déjà des fonctions pures testées ? Sinon, tester via le build : avec `ZWIBBA_SUPPORT_WHATSAPP_CD=+243111222333 node scripts/build.mjs`, `dist/App/index.html` contient `window.ZWIBBA_SUPPORT_WHATSAPP` avec la valeur CD, et `dist/contact/index.html` contient `https://wa.me/243111222333` ; sans les env, aucun `wa.me` support dans ces deux fichiers. Écrire ce test en node:test qui exécute le build (réutiliser la façon dont les tests existants exercent `scripts/build.mjs` s'il y en a — grep `build.mjs` dans `tests/` — sinon spawn `node scripts/build.mjs` avec env et lire `dist/`).
   (b) l'écran profil avec `supportWhatsAppLink` non nul rend un lien « Support WhatsApp » ; sans, rien.
2. `node --test tests/*.test.mjs` → FAIL.
3. Implémenter :
   - `scripts/build.mjs` : lire `process.env.ZWIBBA_SUPPORT_WHATSAPP_CD ?? ''` et `_BE ?? ''` ; injecter dans la page App, à côté de `window.ZWIBBA_API_BASE_URL` : `window.ZWIBBA_SUPPORT_WHATSAPP = ${JSON.stringify({ CD: supportCd, BE: supportBe })};` ; dans `renderContactPage`, quand au moins un numéro est configuré, rendre un bloc « WhatsApp » avec un lien `https://wa.me/<digits>` par marché configuré (labels « RDC » / « Belgique » ; réutiliser la logique digits du helper — dupliquer la regex `\D` en une petite fonction locale du build, `shared/` n'étant pas nécessaire pour deux lignes).
   - App : dans `App/app.js`, construire `supportWhatsAppLink` via `buildWhatsAppChatLink((window.ZWIBBA_SUPPORT_WHATSAPP ?? {})[resolveBrowseCountry()])` (garde `typeof window`) et le passer à l'écran profil selon le style de paramètres existant ; l'écran profil rend, sous les infos existantes :

```js
supportWhatsAppLink
  ? `<a class="app-flow__button app-flow__button--secondary" href="${escapeAttribute(supportWhatsAppLink)}" target="_blank" rel="noreferrer">Support WhatsApp</a>`
  : ''
```

4. `node --test tests/*.test.mjs` → PASS ; `node --check App/app.js` ; `node scripts/build.mjs` → exit 0 ; `npm run smoke:monorepo` → exit 0. Citer les compteurs.
5. Commit : `git commit -m "feat: expose per-market whatsapp support numbers"`
