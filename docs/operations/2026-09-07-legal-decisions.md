# Zwibba — Sources, décisions et blocages

**7 septembre 2026 · version draft-2026-09-07 · document interne, non destiné à publication.**

Ce mémo accompagne neuf brouillons (CGU, confidentialité, mentions légales × fr-BE, fr-CD, nl-BE). Il n'est pas une validation juridique et je ne suis pas en mesure d'en produire une. Il consigne ce que j'ai lu dans le code, ce que j'ai vérifié auprès de sources primaires, et ce qui reste ouvert.

Périmètre de la session : lecture seule du dépôt `/private/tmp/zwibba-cgu-modern-sharing` (branche `codex/cgu-modern-sharing`), recherche web, rédaction dans `/private/tmp/zwibba-legal-drafts` uniquement. Aucun fichier du dépôt modifié, aucune opération Git, aucun déploiement, aucun message émis, aucun sous-agent lancé.

Note sur l'état du dépôt : au début de la session le worktree était sur `f1ad186` avec quatre fichiers modifiés ; il est passé à `c238227` (« docs: record modern sharing verification ») pendant la session, du fait d'une autre session travaillant sur la même branche. Ce commit ne touche que de la documentation ; les faits relevés ci-dessous portent sur le schéma Prisma et la configuration de l'API, inchangés entre les deux états.

---

## 1. Faits établis par lecture du code

| Fait | Emplacement |
|---|---|
| Deux marchés à parité, indicatifs `+32` et `+243` | `apps/api/src/auth/phone-country.ts` |
| Vitrine en trois locales `fr-cd`, `fr-be`, `nl-be` | `src/site/locales/` |
| Compte : `phoneNumber`, `displayName`, `area`, `countryCode`. **Aucune date de naissance, aucun champ d'âge** | `apps/api/prisma/schema.prisma:10-24` |
| Nom d'affichage exposé publiquement (repli « Vendeur Zwibba ») | `apps/api/src/listings/listings.service.ts:122` |
| Numéro du propriétaire porté par `Draft` et `Listing` | `schema.prisma:51`, `:108` |
| `ListingLifecycleEvent` enregistre `actorPhoneNumber` | `schema.prisma:163-177` |
| Avis et signalements d'avis | `schema.prisma:130-161` |
| Chaîne IA : `AI_PROVIDER=multi` → Gemini, puis Anthropic si clé, puis Mistral si clé ; `AI_PROVIDER=mistral` → Mistral seul ; sinon stub. Google Cloud Vision uniquement si `AI_GOOGLE_VISION_ENRICHMENT_ENABLED` | `apps/api/src/config/env.ts:291-322`, `apps/api/src/ai/ai.module.ts:93-142` |
| Agent d'assistance WhatsApp adossé à Claude, conversations et `waId` stockés | `env.ts:358-397`, `schema.prisma:273-308` |
| Stockage photos et diffusion : Cloudflare R2 | `env.ts:350-357`, `apps/api/src/media/r2-storage.service.ts` |
| `SearchQueryEvent` : `rawQuery` en clair, sans identifiant de compte | `schema.prisma:310-321` |
| `ListingPriceEvent` : `draftId` / `listingId` → remonte à `Draft.ownerPhoneNumber`. **Non anonyme** | `schema.prisma:323-338` |
| Portefeuille : `amountCdf` uniquement, aucun achat, aucun prestataire de paiement. Seul crédit : amorçage bêta si `OTP_PROVIDER=demo` | `schema.prisma:222-248`, `apps/api/src/auth/auth.service.ts:129` |
| **Aucun modèle d'acceptation des CGU ni de consentement** dans le schéma | `schema.prisma` (21 modèles, aucun) |
| **Aucun endpoint de suppression de compte, d'export ou de portabilité.** Seul `@Delete` du dépôt : suppression de brouillon | `apps/api/src/drafts/drafts.controller.ts:59` |
| Aucune tâche de purge programmée | recherche sans résultat |

Ces constats recoupent la revue interne `docs/operations/2026-09-07-cgu-sharing-review.md`, que j'ai relue et re-vérifiée point par point sur le schéma actuel.

---

## 2. Sources externes réellement consultées

**Belgique — mentions obligatoires.** SPF Economie énumère huit éléments : nom, adresse d'établissement, coordonnées de contact dont une adresse e-mail, numéro d'entreprise BCE, autorité de surveillance si l'activité requiert une autorisation, association ou titre professionnel pour les professions réglementées, numéro de TVA si assujetti, code de conduite le cas échéant. Les mentions légales des trois locales suivent cette liste.
→ https://news.economie.fgov.be/203681-informations-obligatoires-sur-le-site-web-de-votre-entreprise/
→ https://economie.fgov.be/fr/e-commerce/mettre-en-place-vos-supports/les-informations-obligatoires

**DSA.** Le SPF Economie confirme le champ (services intermédiaires, dont les plateformes), les autorités belges de contrôle (IBPT coordinateur, CSA, VRM, Medienrat) et l'exemption d'« une grande partie des règles » pour les micro et petites entreprises.
→ https://economie.fgov.be/fr/themes/line/economie-des-plateformes-en/digital-services-act-dsa-le

Le texte du règlement (UE) 2022/2065 confirme la portée exacte de cette exemption : l'article 19 écarte la **section 3** pour les micro et petites entreprises non désignées très grandes plateformes, mais les **articles 16 (mécanismes de notification et d'action) et 17 (exposé des motifs), en section 2, restent applicables** à tout fournisseur de service d'hébergement. C'est ce qui justifie, dans les CGU, un canal de signalement et une motivation des retraits — et **rien de plus** : pas de système interne de traitement des réclamations, pas de règlement extrajudiciaire, pas de signaleurs de confiance.
→ https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng
→ https://digital-strategy.ec.europa.eu/en/faqs/digital-services-act-questions-and-answers

**RGPD — droits et délais.** L'Autorité de protection des données (autorité de contrôle belge) énumère les huit droits repris dans les notices et confirme le délai : réponse dans un mois, prolongeable de deux mois pour une demande complexe si la personne est informée dans le premier mois, gratuité de l'exercice, obligation d'indiquer les motifs d'inaction dans le mois.
→ https://www.autoriteprotectiondonnees.be/professionnel/rgpd-/droits-des-citoyens
→ https://www.autoriteprotectiondonnees.be/citoyen/quels-sont-mes-droits-
Adresse de réclamation vérifiée : Rue de la Presse 35, 1000 Bruxelles.
→ https://www.autoriteprotectiondonnees.be/citoyen/contact

**Consommateur — loi applicable et juridiction.** Le règlement Rome I (art. 6) empêche un choix de loi de priver le consommateur de la protection impérative de sa résidence habituelle lorsque le professionnel dirige son activité vers ce pays ; le règlement Bruxelles I bis (art. 18) lui permet d'agir devant la juridiction de son domicile. C'est la formulation retenue à l'article 12 des CGU BE.
→ https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX%3A32008R0593
→ https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=celex:32012R1215

**RDC — Code du numérique.** Ordonnance-loi n° 23/010 du 13 mars 2023. Publication institutionnelle identifiée (ARE, 45,3 Mo) et miroir UNHCR Refworld.
→ https://are.gouv.cd/download/ordonnance-loi-23-010-du-13-mars-portant-code-du-numerique/
→ https://www.refworld.org/legal/natleginstr/natlegbod/2023/fr/150225
→ https://droitnumerique.cd/code-du-numerique/livre-iii-titre-iii/

Structure relevée : Livre III, Titre III « Des données personnelles ». Droits de la personne concernée aux articles 209 à 218 (information et accès 209, portabilité 211, opposition 213, rectification 214, effacement 215 avec un délai de trente jours) ; obligations du responsable à partir de 219 ; transmission et transfert au chapitre IV, articles 197 à 202 ; autorité de protection des données aux articles 262 à 270.

**Article 201 — point le plus lourd de conséquences.** Le texte relevé pose le principe du stockage et de l'hébergement des données personnelles **en République démocratique du Congo**, le transfert vers un hébergeur d'un État tiers étant subordonné au constat, par l'Autorité de protection des données, d'un niveau de protection adéquat ; l'article 202 énumère les cas dérogatoires. Zwibba héberge sur Railway et Cloudflare, hors RDC.

---

## 3. Limites de vérification — à lire avant tout usage

1. **EUR-Lex n'a pas pu être récupéré directement.** Six tentatives sur `eur-lex.europa.eu` (RGPD et DSA, formats HTML, ELI, CELEX) ont renvoyé une page vide côté outil. Le contenu du DSA cité ci-dessus provient de résultats de recherche restreints à `eur-lex.europa.eu` et `digital-strategy.ec.europa.eu` qui en reproduisent le texte, et de la page DSA du SPF Economie. Les intitulés des droits RGPD proviennent de l'APD, autorité de contrôle belge. **Aucune citation du RGPD ou du DSA dans les brouillons n'est présentée comme un extrait littéral.**
2. **Le Code du numérique n'a pas été lu sur une source officielle.** Le PDF de l'ARE dépasse la taille récupérable par l'outil ; `leganet.cd` a échoué sur un certificat auto-signé ; Refworld a renvoyé 403. Les articles 201, 202, 209 et 213 à 215 ont été obtenus par deux interrogations indépendantes de `droitnumerique.cd`, **miroir privé et non officiel**, concordantes entre elles et avec la structure confirmée par recherche. **Une lecture du texte officiel par un juriste congolais est indispensable avant toute publication du jeu fr-CD.** C'est pourquoi les brouillons fr-CD ne citent aucun numéro d'article.
3. **Autorité congolaise.** Des sources secondaires indiquent que l'Autorité de protection des données prévue par le Code n'est pas encore constituée et que ses missions auraient été confiées à l'ARPTIC par arrêté ministériel du 17 août 2024. **Non vérifié sur source officielle.** Les brouillons fr-CD parlent donc de « l'autorité congolaise compétente » sans la nommer.
4. **Qualification micro/petite entreprise.** L'exemption DSA de la section 3 en dépend, et dépend de l'identité juridique de l'exploitant, encore inconnue. À confirmer une fois celle-ci arrêtée.

---

## 4. Décisions qui vous reviennent

1. **Identité de l'exploitant.** `[[LEGAL_NAME]]`, `[[LEGAL_FORM]]`, `[[ADDRESS]]`, `[[ENTERPRISE_NUMBER]]`, `[[VAT_NUMBER_IF_APPLICABLE]]`. Sans elles, aucune mention légale n'est publiable, ni en Belgique ni en RDC.
2. **Canal de contact.** `[[CONTACT_EMAIL]]` joue trois rôles dans les brouillons : contact général, point de signalement DSA, réception des demandes de droits. Une seule adresse peut suffire, mais elle doit être relevée et une réponse doit être possible dans le mois. Décidez si cette adresse est unique ou si le signalement et les droits passent par des adresses distinctes. `hello@aivesconsulting.com` n'a pas été présumée.
3. **Âge minimum.** `[[MINIMUM_AGE_TO_CONFIRM]]` est une proposition, pas une décision. Trois options : fixer un âge et le faire déclarer à l'inscription (implique un champ et une trace) ; fixer un âge sans contrôle et l'assumer comme règle contractuelle ; retirer la clause. Publier « 18 ans » sans rien qui l'applique serait un engagement vide — c'est exactement le défaut du brouillon de l'ancienne branche.
4. **Conservation.** Aucune purge n'existe. Soit vous acceptez la formulation actuelle (« tant que le compte et les annonces existent, pas de durée chiffrée »), soit vous décidez des durées et il faut alors les implémenter avant de les écrire.
5. **Droits des personnes.** Traitement manuel assumé dans les brouillons. Il faut une boîte réellement surveillée et une procédure interne, faute de quoi le délai d'un mois sera manqué. L'absence d'endpoint n'enlève aucun droit.
6. **Hébergement en RDC.** Décision de fond : régulariser au regard des articles 197 à 202, obtenir un avis local, ou différer la publication du jeu fr-CD. Ne pas publier une notice congolaise qui passerait la question sous silence.
7. **Garanties de transfert hors EEE.** Railway, Cloudflare, Meta, Google, Anthropic, Mistral. Aucun DPA ni clause contractuelle type n'a été vérifié dans cette session. Les notices BE le disent explicitement ; il faut soit les vérifier, soit maintenir la phrase.
8. **Licence de contenu.** Les brouillons la limitent à l'hébergement, à l'affichage et à la préparation des partages demandés par l'utilisateur, pour la durée de publication. Tout usage promotionnel de Zwibba en est exclu et exigerait un accord distinct. À confirmer, y compris pour les visuels story générés.
9. **Paiement.** Aucun achat de jetons n'existe. Les brouillons le disent. Si un paiement arrive, la version BE devra intégrer information précontractuelle, prix TTC et droit de rétractation — donc une nouvelle version, pas une retouche.

---

## 5. Écarts assumés avec les brouillons de l'ancienne branche

Non repris, volontairement : l'exploitation future des données et le score vendeur ; le consentement global adossé à la création de compte ; les durées de conservation chiffrées ; la promesse de notification et de recours en modération ; le droit de rétractation sur des achats inexistants ; la phrase affirmant que les analyses agrégées n'identifient personne — `ListingPriceEvent` la contredit. Les brouillons distinguent partout l'acceptation contractuelle des CGU, la notice de confidentialité informative et un éventuel consentement facultatif à finalité déterminée.

---

## 6. Inventaire livré

| Fichier | Marché | Mots (`wc -w`) |
|---|---|---|
| `terms.fr-BE.md` | Belgique | 726 |
| `terms.fr-CD.md` | RDC | 697 |
| `terms.nl-BE.md` | Belgique (NL) | 683 |
| `privacy.fr-BE.md` | Belgique | 696 |
| `privacy.fr-CD.md` | RDC | 700 |
| `privacy.nl-BE.md` | Belgique (NL) | 641 |
| `legal-notice.fr-BE.md` | Belgique | 211 |
| `legal-notice.fr-CD.md` | RDC | 223 |
| `legal-notice.nl-BE.md` | Belgique (NL) | 185 |
| `SOURCES-AND-DECISIONS.md` | — | ce mémo |

Ces chiffres sont ceux de `wc -w`, qui compte aussi le bandeau de projet, la ligne de version, les titres de section et les jetons `[[…]]` — environ 70 mots de non-prose par document. Le corps rédigé se situe donc autour de 610 à 655 mots pour les CGU et les notices de confidentialité, et de 120 à 155 pour les mentions légales.

## 7. Ce qui empêche la publication

1. Identité juridique de l'exploitant inconnue — bloquant absolu, neuf documents concernés.
2. Adresse de contact non arrêtée et non instrumentée.
3. Jeu fr-CD non vérifié sur le texte officiel du Code du numérique, et question d'hébergement territorial non tranchée.
4. Aucune décision sur l'âge minimum.
5. Aucun mécanisme d'acceptation versionnée en base — les CGU décrivent un dispositif qui n'existe pas encore. Soit il est construit avant publication, soit l'article 4 doit être réécrit au présent de ce qui existe.
6. Aucune relecture par un juriste. Ces textes sont un point de départ documenté, pas un produit fini.

## Relecture Codex après rédaction

Ce rapport décrit le travail de Claude et comporte aussi des interprétations à ne pas prendre comme certification juridique. Le commit c238227 incluait des corrections fonctionnelles en plus de documentation, contrairement à la phrase initiale du rapport.

Corrections factuelles apportées aux neuf brouillons avant intégration : l’IA ne propose pas le prix (le vendeur le fixe) ; la consultation publique ne nécessite pas de compte ; le téléphone peut être exposé par les liens de contact et ne doit pas être présenté comme privé ; la plateforme n’est pas arbitrairement limitée aux particuliers ; distinguer les prix EUR des annonces et un achat de crédit inexistant.

L’absence de purge automatique ne justifie pas une conservation illimitée ni une notice sans critères. Des placeholders explicites de conservation et de garanties de transfert empêchent l’activation prématurée. Ne pas supprimer ces marqueurs pour contourner le contrôle de publication : documenter d’abord les décisions et leur mise en œuvre.

Le passage relatif aux droits doit être lu avec leurs conditions légales ; absence de bouton ne supprime aucun droit. Les brouillons sont un support de travail, pas des textes applicables ni une déclaration de conformité du service. Le catalogue reste draft.
