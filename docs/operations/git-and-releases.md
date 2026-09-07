# Git et livraisons Zwibba

Décision du 7 septembre 2026, à la demande d’Yves : mettre Git en ordre et recevoir les avancées/demandes de décision dans Codex sur iPhone.

## Référence unique

Le trunk reste codex/website-vitrine-backup. Il est la cible de toute PR applicative et doit être la branche par défaut GitHub. main est conservée comme historique ; aucune réécriture ni fusion du monorepo dans main n’est nécessaire.

Le dossier /Users/pc/zwibba-website est destiné à présenter le trunk courant. /Users/pc/zwibba-website-worktrees/browser-live est une copie de livraison détachée au commit validé. Les fonctionnalités sont réalisées dans des worktrees dédiés codex/<sujet>, un seul agent propriétaire des fichiers concernés.

## Histoire préservée

Avant la remise en ordre, un bundle Git complet et les différences non enregistrées ont été sauvegardés dans /Users/pc/zwibba-website-recovery/2026-09-07. Le manifeste worktree-inventory.json identifie les copies et leurs sauvegardes. Le bundle ne sauvegarde pas les bases ou les médias de production.

Les anciens travaux account-creation-gating, live-refresh-comfort et share-fb-whatsapp-fix ne doivent pas être considérés comme approuvés pour publication. Les commits documentaires 5374a3a et ee1605e sont conservés dans l’archive ; ils ne contiennent pas de fonctionnalité à fusionner. Les commits b7b8226/cbead28 apportent le bundling déjà livré manuellement et sa documentation.

## Livraison vérifiable

1. Relever branche, SHA, git status et diff complet. Aucun fichier non revu dans la livraison.
2. Installer avec le lockfile pnpm et exécuter build/tests pertinents. La CI GitHub couvre web, API et admin ; elle ne prouve pas une recette mobile réelle.
3. Ouvrir une PR vers le trunk, attendre la CI et la revue. Aucun push direct sur le trunk.
4. Avant fusion, relever les déploiements actifs website/API/admin. Un SUCCESS ou un message de CLI n’est pas une preuve d’identité avec un commit.
5. Après fusion, vérifier séparément chaque service affecté. API et website sont connectés au dépôt, mais un upload CLI peut avoir remplacé la dernière version GitHub. Admin n’était pas connecté lors de la vérification du 7 septembre.
6. Si un upload est nécessaire, utiliser un checkout propre au SHA fusionné et un message contenant le SHA. Vérifier le service/projet/environnement explicitement. Ne jamais utiliser un dossier divergent comme source de production.
7. Attendre SUCCESS puis vérifier HTTP et le parcours concerné. Conserver SHA, ID de déploiement, date et résultat des sondes dans le registre de livraison. Relever la version précédente comme cible de retour arrière ; vérifier la commande Railway disponible avant toute restauration, ne pas présumer qu’elle accepte un ancien ID.
8. Informer Yves du résultat et des limites. S’il faut une décision, donner la question précise et son impact.

La procédure de ce guide remplace les anciennes instructions imposant aveuglément un pull --ff-only dans browser-live ou un upload website pour chaque type de changement. Un simple merge ne démontre pas la livraison de tous les services.

## Notifications demandées

Pour cette remise en ordre, Yves choisit les notifications natives Codex sur iPhone. Publier dans la tâche les jalons utiles, les résultats finaux et les demandes de décision. Les réglages de notifications/permissions de l’application et d’iOS doivent être vérifiés sur les appareils ; ne jamais prétendre les avoir activés ou avoir livré un push sans preuve. Les emails opérationnels imposés par l’accord commun pour les incidents/déploiements restent distincts, sauf instruction contraire explicite.

Ne pas créer de surveillance récurrente doublonnant les automations communes. Une réponse iPhone n’autorise que l’action qu’elle décrit ; ni lecture ni silence ne vaut approbation.
