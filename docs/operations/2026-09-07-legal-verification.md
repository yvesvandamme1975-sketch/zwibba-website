# Zwibba — CGU et acceptation : état du 7 septembre 2026

## Statut réel

Préparation isolée sur `codex/legal-terms-acceptance`. Catalogue en **draft** : aucun brouillon publié, aucun utilisateur considéré comme ayant accepté ces textes. Le partage a été livré séparément par PR59/PR60, commit `8de210aa5dcb6719c58b3190533c83d9a27a13c8`.

Les neuf documents couvrent CGU, confidentialité et mentions légales en français Belgique/RDC et néerlandais Belgique. Ils ont été rédigés avec Claude Code puis corrigés à partir du code réel : prix fixé par le vendeur, téléphone potentiellement exposé par les liens de contact, recherche et événements de prix non abusivement qualifiés d’anonymes, absence d’achat de crédit, licence de contenu limitée, absence de prétendue assistance WhatsApp opérationnelle.

Le catalogue refuse les textes incomplets, les empreintes incorrectes et un jeu de langues incomplet. La preuve d’acceptation conserve le texte exact, sa version, sa langue, son marché et sa date. Aucune preuve n’est inventée pour les comptes existants. La migration est générée via Prisma et n’a pas été appliquée à la production.

## Revue et tests

- Branche finale intégrant le trunk livré : **513 tests web, 400 tests API et 12 tests admin passent**. Builds web/API et smoke:production-contracts réussis. Aucun test ignoré.
- Catalogue : 9 tests passent, dont le basculement à la date d’effet sans redémarrage.
- Revue indépendante : deux défauts reproduits puis corrigés (activation figée, privilèges propriétaire via authentification facultative) ; seconde lecture sans constat bloquant sur ces corrections.
- Claude Code (session 0da0c786-5123-47dc-b9af-11fd17160917) : 13 tests ciblés et 26 contrôles Chromium rapportés, notamment version409, reprise428, statut503 honnête, maintien du code et invalidation de la case après changement de texte.
- Codex : recette Chromium390px reproduite avec données fictives : inscription, compte existant et **première activation pendant l’OTP**. Ce dernier cas échouait avant l’ajout de TERMS_ACCEPTANCE_REQUIRED et passe après correction. Captures inspectées ; case lisible et liens espacés après correction CSS.
- Les réponses tardives ne réactivent pas un challenge consommé et ne lui appliquent pas les textes d’un autre numéro. Trois tests du transport428 et deux tests de course du challenge passent.
- Seconde revue frontend : les trois constats sont fermés, aucun autre blocage concret relevé dans le périmètre. Aucune publication des textes ni acceptation d’un vrai compte n’a servi au test.

## Informations et décisions encore nécessaires

1. **Exploitant et coordonnées confirmés par Yves le 7 septembre** : Yves Van Damme, personne physique indépendante sous le nom commercial provisoire Aïves Consulting ; Rue Jean Schyns 29, 7100 La Louvière, Belgique ; BCE 0825.089.324. Les neuf brouillons sont complétés. Le numéro/statut TVA reste distinct et non confirmé par cette réponse.
2. **Contact confirmé : hello@aivesconsulting.com**, pour Zwibba, les signalements et les droits sur les données. La procédure de prise en charge et de notification des motifs de modération reste à vérifier.
3. Accès des mineurs : après relecture de Claude, Yves décide « Interdit aux mineurs ». Les trois CGU réservent le service aux personnes de 18 ans révolus, sans exception parentale. La case obligatoire d’acceptation déclare explicitement la majorité. Il s’agit d’une attestation, pas d’une vérification réelle d’âge ; la navigation publique reste techniquement accessible et le respect effectif des conditions Gemini reste à examiner.
4. Durées ou critères de conservation par catégorie et modalités concrètes de suppression, y compris preuve contractuelle. L’absence de purge ne justifie pas une conservation illimitée.
5. Localisation effective, contrats et garanties des prestataires/transferts ; situation applicable en RDC à vérifier sur les sources officielles. Aucune conformité ni obligation de migration territoriale n’est certifiée par une génération de texte.

Ces données manquantes empêchent la finalisation des textes, pas la préparation technique déjà autorisée. L’approbation du cadrage par Yves est acquise ; il n’y a pas de nouvelle demande d’autorisation de conception.

## Sources et limites

Sources consultées : SPF Économie (mentions obligatoires et DSA), EUR-Lex (RGPD), publication du Code du numérique sur le site gouvernemental ARE et copie diffusée par Refworld. Le PDF Refworld reprend une édition Droit-Numerique.cd : cette copie n’est pas une preuve autonome de la pratique actuelle des autorités. Le mémo initial de Claude conserve les limites de ses vérifications. Les textes sont des brouillons documentés, sans certification juridique.

- https://news.economie.fgov.be/203681-informations-obligatoires-sur-le-site-web-de-votre-entreprise/
- https://economie.fgov.be/fr/themes/line/economie-des-plateformes-en/digital-services-act-dsa-le
- https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=FR
- https://are.gouv.cd/download/ordonnance-loi-23-010-du-13-mars-portant-code-du-numerique/
- https://www.refworld.org/legal/natleginstr/natlegbod/2023/150225


## Reproduire la recette navigateur

`npm run build`, puis `PORT=4330 node server.mjs` dans cette branche, et dans un autre terminal `node scripts/e2e/legal-acceptance.mjs`. Le script intercepte une API fictive : il ne se connecte pas à un compte réel et n’enregistre aucune acceptation de production. Les suites unitaires restent exécutables par les scripts habituels.

## Livrable et suite

Ouvrir la PR en brouillon vers le trunk et conserver la préparation non déployée tant que les faits listés ci-dessus ne sont pas finalisés. Avant activation : catalogue complet, contrôle des documents servis et de leurs empreintes, migration PostgreSQL vérifiée, puis smoke de cohérence website/API. Le registre actuel a été testé avec un adaptateur transactionnel de test ; la migration de cette fonctionnalité n’a pas encore été exécutée sur la base de production.


## Décision complémentaire — exploitant provisoire

Yves précise : « Sous le nom d’aives consulting pour l’instant ». Cette décision remplace l’incertitude sur le nom commercial et conserve son caractère provisoire. Elle ne signifie ni création d’une société distincte ni confirmation automatique des autres coordonnées. Les notes Aïves contiennent des coordonnées historiques ; leur actualité reste à confirmer, la consultation du registre officiel n’ayant pas abouti dans cette session. Catalogue maintenu draft.

### Confirmation des coordonnées

Yves répond « oui » à la confirmation de son identité d’indépendant, de la BCE 0825.089.324, de l’adresse Rue Jean Schyns 29, 7100 La Louvière et de hello@aivesconsulting.com comme contact Zwibba. Cette confirmation remplace les réserves d’actualité ci-dessus pour ces seules coordonnées. Les champs correspondants sont complétés dans les neuf textes ; les autres décisions et le statut draft sont conservés.

## Nouvelle demande de publication et vérification Claude

Yves demande de publier après une nouvelle vérification par Claude. La revue réelle du commit `c2a620e` (session `b24caf4c-7abe-4d6f-b3f0-b2e7a84364fa`) conclut **NOT READY**. Le rapport est conservé dans `2026-09-07-claude-legal-publication-review.md`. Il s’agit d’un avis technique et documentaire ; les hypothèses juridiques du rapport ne sont pas une certification.

Vérification complémentaire de la configuration API de production, limitée aux valeurs publiques et à la présence des clés : fournisseur `multi`, Gemini configuré, enrichissement Google Cloud Vision activé ; Anthropic et Mistral non configurés. OTP Meta configuré. Aucune clé n’est enregistrée dans ce rapport. Les conditions Gemini officielles du 23 mars 2026 excluent les applications susceptibles d’être utilisées par des moins de 18 ans : une clause parentale seule ne résout donc pas l’accès des mineurs avec cette intégration. Source : https://ai.google.dev/gemini-api/terms .

Les DPA publics Railway et Cloudflare ont été trouvés ; cela ne vérifie ni les contrats effectivement applicables au compte, ni la localisation des traitements, ni les garanties de transfert requises. Les critères de conservation doivent correspondre à une procédure réelle ; remplacer un champ par une formule vague ne suffit pas.

Avant publication, corriger également les notes internes encore présentes dans les neuf textes, décrire la modération automatisée réellement utilisée, préciser les contacts et vérifier les prestataires analytiques actifs et la langue réellement acceptée. Le catalogue reste draft et la migration n’est pas appliquée. Aucun nouveau test applicatif n’est revendiqué pour cette seule mise à jour documentaire.

## Décision explicite — majeurs, transactions et données

Yves décide « Interdit aux mineurs » et confirme que les transactions sont conclues entre acheteurs et vendeurs, Zwibba assurant leur mise en relation. Les trois CGU et le champ commun d’acceptation sont adaptés ; la preuve existante reste liée au texte versionné. Les responsabilités propres de l’exploitant et les droits impératifs restent préservés.

La demande « les données […] appartiennent à Zwibba » est transcrite en responsabilité du traitement pour les finalités annoncées, sans appropriation des données ni suppression des droits individuels. Cette distinction a été expliquée à Yves. Les trois notices précisent aussi la nécessité du téléphone pour créer un compte. Références de contrôle : RGPD articles 5, 6 et 12–22 (https://eur-lex.europa.eu/eli/reg/2016/679/oj?locale=FR), informations APD sur les droits et SPF Économie sur les clauses abusives.

Vérification de cette modification : test de déclaration de majorité observé en échec avant changement ; 23 tests ciblés passent après modification (acceptation, catalogue, service auth), build réussi. Empreintes des six textes mises à jour. Catalogue toujours draft ; pas de publication, migration ou déploiement. TVA, conservation, garanties des prestataires et autres constats de relecture restent ouverts.

### Relecture Claude de cette décision

Session `c0db32fd-6801-449d-95a8-cd05582cdcd2`, lecture du diff uniquement :

Revue lecture seule effectuée (aucune modification, aucun envoi). J'ai lu le diff complet des 12 fichiers, `apps/api/assets/legal/catalog.mjs` et lancé les tests ciblés : 23 passent, conforme à ce qu'affirme `docs/operations/2026-09-07-legal-verification.md`.

**Défauts concrets**

1. **Empreintes non vérifiables ici.** Les six `sha256` du manifeste ont été réécrits, mais `catalog.mjs:13` retourne immédiatement quand `status: "draft"` : aucun test ne compare l'empreinte au fichier réel. Les commandes de hachage sont bloquées dans ce bac à sable, je n'ai donc pas pu confirmer les six valeurs. Une empreinte fausse ne se révélerait qu'au moment de la publication. À recalculer explicitement avant activation.

2. **Attestation uniquement en français.** `terms-acceptance-screen.mjs:69` place « Je certifie avoir 18 ans révolus » dans le champ commun, codé en dur en français, alors que le catalogue prévoit des CGU `nl-BE` dont le titre s'affiche en néerlandais. Un utilisateur belge néerlandophone déclarerait sa majorité dans une langue qui n'est pas celle du texte accepté.

3. **Portée de l'interdiction plus large que ce qui est appliqué.** Les trois CGU interdisent « l'accès et l'utilisation » aux mineurs, mais seule la création ou réacceptation de compte passe par la case ; la consultation publique reste ouverte sans aucun contrôle. Limiter la formule à l'usage du compte, ou dire que rien n'est vérifié côté navigation, éviterait de promettre plus que l'implémentation.

Le reste est cohérent : responsabilité du traitement sans appropriation, obligations impératives préservées, preuve rattachée au texte versionné, catalogue toujours `draft`, aucune conformité Gemini revendiquée.

Corrections après revue : les neuf empreintes réelles ont été comparées explicitement par SHA256, hors court-circuit draft ; la déclaration de majorité et d’acceptation s’affiche en néerlandais pour nl-BE (test observé en échec puis corrigé). Le reste du parcours reste en français, limite de langue déjà identifiée. Les trois CGU précisent aussi l’absence actuelle de contrôle d’âge sur les pages publiques, sans autoriser les mineurs. 24 tests ciblés et build passent après ces corrections.
