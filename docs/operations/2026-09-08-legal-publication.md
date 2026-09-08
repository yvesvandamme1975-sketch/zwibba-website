# Zwibba — finalisation et publication légale, 8 septembre 2026

## Décisions et faits vérifiés

Yves confirme TVA BE0825089324 et franchise TVA2026. Mineurs interdits, ventes entre utilisateurs, responsabilité propre de l’exploitant préservée et données sans transfert de propriété.

Railway zwibba-production : API/site/Postgres us-west2. Le projet Google attaché à la clé Gemini de production est gen-lang-client-0489049557, facturation active vérifiée via gcloud. Cloudflare zwibba-media : WEUR, juridiction default et diffusion mondiale. MetaOTP actif, aucun Anthropic/Mistral ni Plausible configuré. Support automatique non déclaré opérationnel ; messages entrants potentiellement stockés. Les DPA publiés sont décrits selon leur portée contractuelle, sans certification des prestataires.

## Relecture réelle de Claude

Session 70066722-28b9-4196-a090-092c797e6c87 : trois passes sur les règles RDC, la conservation et les textes effectifs. Verdict final : « Après ces trois corrections : READY FOR TEXT PUBLICATION ». Corrections appliquées : identifiant et téléphone liés aux preuves sous accès restreint, sessions sans expiration traitées, absence de faux choix de langue dans le parcours actuel. Délai RDC30jours et langHTML cohérent également corrigés. L’avis est limité aux textes ; aucune certification de l’ensemble du service.

## Obligations opérationnelles distinctes

La procédure manuelle de droits/conservation est dans 2026-09-08-data-rights-and-retention.md. Aucun effacement de vrai compte ni purge historique n’est prétendu. Une revue mensuelle des échéances doit être effectuée par l’exploitant ; aucun nouveau scheduler de purge n’est déclaré actif. La fenêtre complète des sauvegardes reste non vérifiée et cette limite est publique.

Les formalités ARPTC et les garanties/autorisation de transfert RDC doivent être vérifiées auprès des autorités compétentes. Les arrêtés2026 trouvés via analyses secondaires n’ont pas été validés sur le Journal officiel. Absence de preuve n’est pas preuve d’absence de formalité accomplie ; aucune autorisation ou dérogation n’est inventée dans la notice. Le choix d’un hébergeur étranger ne prouve pas une nécessité contractuelle. Publier les informations réelles ne règle pas ces obligations d’exploitation, déjà pertinentes pour le service en ligne.

## Vérifications avant activation

Test de navigation observé en échec puis corrigé :10tests catalogue/navigation passent. Suites complètes avant activation :516web,400API,12admin, builds et smoke réussis. Premier essai dans le bac à sable échoue sur écoute HTTP locale EPERM ; même code vérifié hors restriction. Les scripts d’acceptation existants conservent la preuve versionnée. Sauvegarde et migration doivent être vérifiées avant livraison.

## Activation préparée

Catalogue version2026-09-08, effet9septembre2026à00h00 Bruxelles. Les neuf documents sont renommés et leurs empreintes recalculées ; un test du catalogue réel vérifie la consultation avant effet et l’activation ensuite. LEGAL_POLICY est enregistré explicitement dans AuthModule, sans exemption de production. Les fixtures non juridiques injectent leur politique inactive pour ne pas dépendre du calendrier ; testNest reproduit l’override ignoré avant correction et actif ensuite. Deux constructeurs de fixtures initialement oubliés ont été corrigés après leur échec observé.

Sauvegarde PostgreSQL pré-migration :154638octets,134entrées lisibles avec pg_restore18. L’ancien pg_dump14 avait refusé le serveur18 sans modification de données ; libpq compatible installé séparément, sans remplacement du serveur. Lisibilité de l’archive vérifiée, sans prétendre une restauration complète.

Recette mobile : le titre néerlandais Verwerkingsverantwoordelijke provoquait407px de largeur sur écran390px. Correction de césure/repli des mots dans la feuille de style des pages légales, après reproduction mesurée.

## Résultat avant livraison

517testsweb,401testsAPI,12testsadmin passent sur le catalogue publié ; buildsweb/API et smokeproductioncontracts réussis. RecetteChromium390px :9pages légales HTTP200 avec3liens, sans débordement après correction ;3parcours d’acceptation fictifs passent (OTP,compteexistant,activationpendantOTP). Captures FR/NL inspectées ; pas de recette sur iPhone physique ni d’acceptation d’un vrai compte.

Revue technique Claude session44541b6d-02b0-48e7-a97c-2946c082c75d : aucun défaut bloquant, vérification de l’injection réelle et de la date dynamique. Réserves levées : fichiers ajoutés au commit et suite API relancée avec401succès après renommage de la fixture ; l’import.ts de cette fixture est exécuté par le lanceur de tests tsx existant, jamais par la production.
