# Relecture Claude avant publication des CGU

Revue du commit `c2a620e`, session réelle Claude Code `b24caf4c-7abe-4d6f-b3f0-b2e7a84364fa`. Avis de revue, non certification juridique. Le complément ci-dessous concernant Gemini prévaut sur la proposition de clause mineurs du rapport initial.

## Réserves de vérification Codex

Le complément Claude contient une inférence incorrecte : un quota gratuit ne prouve pas à lui seul une réutilisation des données belges pour entraînement. Les conditions Gemini prévoient expressément que les règles de traitement des Paid Services s’appliquent aussi aux services gratuits pour les utilisateurs situés dans l’EEE, en Suisse ou au Royaume-Uni. L’exigence de facturation active pour mettre le client à disposition dans ces régions reste distincte et doit être vérifiée. Une simple mention 18+ ne démontre pas non plus à elle seule le respect du critère fournisseur « susceptible d’être accédé ». Les affirmations juridiques générales de la revue initiale et les options RDC restent à vérifier ; elles ne constituent pas une autorisation de publication.

## Verdict : **NOT READY**

Revue en lecture seule uniquement — aucun fichier modifié, aucun commit, aucun envoi. Worktree `/private/tmp/zwibba-legal-terms`, HEAD `c2a620e`.

---

## 1. Publier les CGU seules est impossible — et le serait trompeur

**Techniquement.** `apps/api/assets/legal/catalog.mjs:18` exige exactement `3 locales × 3 types = 9` entrées, puis valide **chacune** des 9 (placeholder + empreinte) avant de retourner un catalogue publié. Il n'existe aucune publication par document ni par marché : basculer `manifest.status` sur `published`, c'est publier les neuf ou rien.

**Et c'est fail-hard, pas fail-soft.** `scripts/build.mjs:17` et `auth.service.ts:36` appellent `loadLegalCatalog()` au chargement/à la construction. Un catalogue incohérent (une empreinte non recalculée, un `[[` oublié) casse **le build du site *et* le boot de l'API**, donc l'OTP et la connexion — pas seulement les pages légales.

**Substantiellement.** L'article 4 des CGU affirme « l'acceptation est enregistrée avec l'identifiant de version ». C'est vrai seulement si `TermsAcceptance` existe en base de production. La migration `20260907161000_terms_acceptance` **n'a pas été appliquée en prod**. Publier le texte avant la migration rend l'article 4 faux et fait échouer `recordTermsAcceptance` à la première inscription. Ordre obligatoire : **migration prod → vérification du chargement du catalogue → bascule `published`**.

---

## 2. Bloquants qui ne demandent qu'un fait de Yves

| # | Bloquant | Nature |
|---|---|---|
| 1 | `[[VAT_NUMBER_IF_APPLICABLE]]` × 6 emplacements (3 mentions légales + 3 CGU) | Fait : numéro TVA **ou** « non assujetti à la TVA » |
| 2 | `[[MINIMUM_AGE_TO_CONFIRM]]` × 3 CGU | Décision — texte proposé §4 |
| 3 | `[[RETENTION_SCHEDULE]]` × 3 notices | Décision, **copie seule** si on écrit des *critères* (RGPD art. 13(2)(a) accepte « durée **ou** critères »). Écrire des durées chiffrées imposerait un job de purge = code neuf |
| 4 | `[[TRANSFER_SAFEGUARDS_TO_VERIFY]]` × 3 notices | Fait à collecter : DPA/CCT de Railway, Cloudflare, Meta, Google, Mistral, Anthropic. Documentaire, aucun code |

---

## 3. Le garde-fou automatique est plus faible que le garde-fou humain — 18 passages non détectés

Le filtre `catalog.mjs:26` ne bloque que `[[`, `draft-\d`, `PROJET —`, `ONTWERP —`. Il **laisserait passer** ces phrases-à-faire rédigées en prose, qui sont tout aussi impubliables :

- `legal-notice.fr-BE.md:24` / `nl-BE:24` — « *(Point à confirmer avant publication…)* »
- `legal-notice.*.md:32` — « *(liens à insérer lors de la mise en ligne)* »
- `legal-notice.fr-CD.md:24` et `:28` — formalités congolaises et hébergement « à examiner avant publication »
- `privacy.*.md:21` — assistance WhatsApp « à vérifier »
- `privacy.fr-BE:43` / `fr-CD:45` / `nl-BE:43` — garanties de transfert « non encore vérifiées »
- `privacy.*.md:47/49` + le titre de section « À compléter avant publication »

C'est de la copie pure, mais il faut la réécrire — pas la supprimer pour passer le gate.

---

## 4. Clause âge/mineurs — remplacement exact proposé

Compatible avec votre refus d'un 18+ sec : elle **ne fixe aucun âge couperet**, **n'invente aucune vérification ni aucun recueil de consentement parental**, et reste vraie dans les deux marchés (majorité à 18 ans en Belgique comme en RDC ; en Belgique l'incapacité du mineur est une nullité *relative* que l'accord parental couvre).

**`terms.fr-BE.md:19` — remplacer la phrase en gras par :**

> Zwibba s'adresse aux personnes qui ont la capacité juridique de conclure ce contrat. Si vous êtes mineur, vous ne pouvez ouvrir et utiliser un compte qu'avec l'accord de la personne qui exerce l'autorité parentale sur vous ; cet accord couvre l'ensemble des actes posés depuis le compte, dont l'utilisation relève de sa responsabilité. Zwibba ne demande pas votre date de naissance et ne met en œuvre aucune vérification d'âge. Lorsque des éléments portés à notre connaissance indiquent qu'un compte est utilisé par un mineur sans cet accord, nous pouvons le suspendre et retirer les annonces publiées.

**`terms.fr-CD.md:19` — même texte, plus une phrase finale :**

> Le droit congolais subordonne au surplus le traitement des données d'un mineur à l'accord de la personne exerçant l'autorité parentale : cet accord doit être obtenu avant toute utilisation de Zwibba.

**`terms.nl-BE.md:19` :**

> Zwibba richt zich tot personen die juridisch bekwaam zijn om deze overeenkomst te sluiten. Bent u minderjarig, dan mag u enkel een account openen en gebruiken met de toestemming van de persoon die het ouderlijk gezag over u uitoefent; die toestemming dekt alle handelingen via het account, waarvan het gebruik onder diens verantwoordelijkheid valt. Zwibba vraagt uw geboortedatum niet en voert geen enkele leeftijdscontrole uit. Wanneer ons elementen bereiken die erop wijzen dat een account door een minderjarige zonder die toestemming wordt gebruikt, kunnen wij het schorsen en de gepubliceerde advertenties verwijderen.

**Réserve à connaître avant d'arbitrer.** Le Code du numérique congolais paraît exiger, en plus du consentement parental, que le responsable de traitement **le vérifie**. Zwibba ne le peut pas ; la clause ci-dessus est honnête mais ne comble pas cet écart, et aucune formulation ne le comblerait. Source : `droitnumerique.cd`, **miroir non officiel** — même limite que celle déjà consignée dans `2026-09-07-legal-decisions.md` §3.2. Ne pas citer de numéro d'article dans le jeu fr-CD tant que le texte officiel n'a pas été lu.

---

## 5. Manques de fond que personne n'a encore listés

1. **Modération automatisée non décrite.** `moderation.service.ts:136-152` bloque automatiquement une publication (`blocked_needs_fix`) sur règles, et route `real_estate` en revue manuelle. Le DSA art. 14(1) impose de décrire les moyens de modération **y compris automatisés** dans les CGU ; l'article 9 actuel n'en dit rien. → copie.
2. **Points de contact DSA art. 11/12** (autorités / destinataires) et **langues acceptées** absents des mentions légales. → copie.
3. **Plausible.** `scripts/build.mjs:49-50, 454` injecte un script analytics tiers **si** `PLAUSIBLE_DOMAIN` est défini. Aucun des neuf textes ne mentionne Plausible. Je n'affirme pas qu'il est activé — **à vérifier côté configuration Railway par root** ; s'il l'est, §6 des notices doit le citer.
4. **nl-BE incohérent.** Les trois documents nl-BE sont publiés et liés dans le footer NL, mais `auth-service.mjs:24-26` fixe `preferredLocale('BE') = 'fr-BE'` et l'écran d'acceptation est en français dur. Un néerlandophone lira des CGU NL puis acceptera les CGU **FR**, et la preuve enregistrera `locale: fr-BE` — alors que les CGU nl-BE affirment être acceptées explicitement. Soit une note de copie assumant que la version contractuelle est la française, soit une petite évolution de code (locale de marché + libellés NL).
5. **RGPD art. 13(2)(e)** manquant : dire que le numéro de téléphone est nécessaire à la création du compte et ce qu'implique son absence. → copie.
6. **Intérêt légitime** invoqué (« mesurer et améliorer ») sans balance des intérêts documentée (art. 5(2)). → note interne, aucune publication requise.

---

## 6. Le seul vrai blocage de fond : l'hébergement RDC

Le Code du numérique pose le principe du stockage/hébergement **en RDC**, le transfert vers un hébergeur étranger supposant un constat d'adéquation par l'Autorité de protection des données — autorité qui, d'après des sources secondaires, n'est pas constituée. Zwibba héberge sur Railway et Cloudflare. Aucune rédaction ne résout cela. Trois issues seulement :

- **(a)** publier fr-CD en énonçant honnêtement l'hébergement hors territoire et la dérogation invoquée (exécution du contrat) — assumé, exposé résiduel ;
- **(b)** avis d'un juriste congolais avant publication du jeu fr-CD ;
- **(c)** publier BE seulement — **impossible sans code neuf** : le catalogue impose les trois locales. Ce serait le seul changement de code exigé par un choix de publication.

---

## 7. Chemin le plus court et sûr

1. Yves tranche **2 faits** : TVA, et validation de la clause §4.
2. Rédiger les **critères** de conservation (pas de durées) + **§ transferts** après collecte des DPA/CCT. Copie + documentation.
3. Réécrire les **18 passages-à-faire** du §3 + les 6 ajouts du §5.
4. Décider l'issue RDC (§6) — c'est le point qui commande le calendrier.
5. Renommer la version en `AAAA-MM-JJ` (le regex `catalog.mjs:14` refuse `draft-…`), fixer `effectiveAt`, **recalculer les 9 sha256**, passer `status: published`.
6. **Appliquer la migration Prisma en prod d'abord**, puis un pré-vol qui charge le catalogue (build site + boot API) avant tout déploiement.

Aucune approbation d'avocat n'est une obligation légale que j'inventerais ici : ce n'est pas un blocage réglementaire, c'est un arbitrage de risque qui vous appartient. Les blocages réels sont ceux listés en §2, §3 et §6.

---

**Sources utilisées cette session** — [APD : limite d'âge de 13 ans (art. 7, loi du 30/07/2018)](https://www.autoriteprotectiondonnees.be/citoyen/rgpd-la-limite-d-age-de-13-ans-correspond-a-la-pratique-numerique) · [Loi du 30/07/2018, texte consolidé](https://etaamb.openjustice.be/fr/loi-du-30-juillet-2018_n2018040581.html) · [Capacité du mineur en droit belge (nullité relative, majorité 18 ans)](https://www.bruxelles-j.be/ton-autonomie/tu-es-mineur/la-capacite-ai-je-le-droit-dagir-seul-en-tant-que-mineur/) · [Code de la famille RDC](https://www.leganet.cd/Legislation/Code%20de%20la%20famille/CDF.2017.pdf) *(non récupérable : certificat auto-signé)* · [Code du numérique RDC — miroir non officiel droitnumerique.cd](https://droitnumerique.cd/code-du-numerique/livre-iii-titre-iii/). EUR-Lex reste non récupérable par l'outil (page vide), comme lors de la session précédente — aucune citation littérale du RGPD ou du DSA n'est présentée ici comme extrait officiel.

## Complément Claude après vérification Gemini — prévaut sur la clause initiale

## Verdict confirmé : **NOT READY** — et un bloquant supplémentaire de rang supérieur

### Correction que je dois apporter à ma revue précédente

Ma clause parentale du §4 est **retirée comme solution suffisante**. Elle réglait la capacité contractuelle (BE/RDC) ; elle ne règle pas une **condition contractuelle de fournisseur** que j'avais manquée.

[Gemini API Terms](https://ai.google.dev/gemini-api/terms), effet 23 mars 2026, vérifiées directement : *« You must be 18 years of age or older to use the APIs »*, et le service intégrant l'API ne peut être **dirigé vers, ni susceptible d'être accédé par, des moins de 18 ans**. `AI_PROVIDER=multi` avec clé Gemini présente : l'IA est sur le chemin réel de publication d'annonce. Donc **aucun paragraphe d'âge, parental ou non, ne peut valider une ouverture aux mineurs dans cette configuration**. Ce n'est ni l'âge RGPD (13 ans, APD — qui ne se confond pas avec la capacité de contracter, recommandation n° 01/2020) ni la majorité civile : c'est une restriction fournisseur qui s'ajoute aux deux.

Trois issues, aucune rédactionnelle :
1. **18 ans requis dans les CGU**, assumé comme règle contractuelle sans contrôle inventé — c'est alors une contrainte fournisseur, pas un choix de style ;
2. **découpler l'IA** (interdire `/ai/draft` hors comptes adultes) → **code neuf**, et ne lève pas le « likely accessed by » ;
3. **changer de fournisseur** → hors périmètre, et à ne pas substituer silencieusement.

### Contrats publiés ≠ garanties vérifiées

Les DPA Railway / Cloudflare / Google existent publiquement ; **leur existence n'établit ni votre contrat, ni le tier souscrit, ni la localisation**. `[[TRANSFER_SAFEGUARDS_TO_VERIFY]]` reste donc non levé.

Point critique et non vérifié : les Gemini Terms réservent aux **Paid Services** la non-utilisation des contenus pour améliorer les produits et l'application du DPA, et imposent l'usage exclusif des Paid Services aux utilisateurs EEE. **Si** l'API tourne en quota gratuit, les photos et textes des vendeurs belges alimenteraient l'amélioration produit avec revue humaine possible, sans DPA — ce qui contredirait frontalement le §6 des notices et priverait le transfert de base. Je n'affirme pas que ce soit le cas : le tier de facturation est déclaré non vérifié. **C'est la vérification n° 1 à faire par root**, avant toute rédaction du paragraphe transferts.

### Ce que les faits confirmés changent dans les textes (copie seule)

- `AI_GOOGLE_VISION_ENRICHMENT_ENABLED=true` + clé présente → Google Cloud Vision est un destinataire **effectif** ; supprimer le « selon la configuration ».
- Clés Anthropic et Mistral **absentes** → les retirer de la liste des destinataires, ou les mentionner explicitement comme non utilisés à ce jour.
- `OTP_PROVIDER=meta` → Meta confirmé destinataire.

### RDC

Copie Refworld de l'art. 247 (consentement parental **et** vérification) et des art. 201-202 confirmée comme source republiée, non certifiée. Rien n'y ordonne une migration territoriale ; l'arbitrage du §6 de ma revue reste ouvert et inchangé.

### Chemin

Vérifier le tier Gemini → arbitrer l'âge sous contrainte fournisseur → corriger les destinataires → puis seulement les étapes 3 à 6 de ma revue précédente.
