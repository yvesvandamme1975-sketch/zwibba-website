# Zwibba

Plateforme de petites annonces Belgique/RDC : vitrine et PWA JavaScript, API NestJS/PostgreSQL/R2, administration Node et projet mobile Flutter.

## Commencer ici

La branche applicative de référence est **codex/website-vitrine-backup**. La branche **main** conserve la landing historique de mars 2026 : ne pas y démarrer de travail applicatif.

- Vitrine : https://zwibba.com
- Application : https://zwibba.com/app/
- Sources web : App/ et src/site/
- API : apps/api/ ; administration : apps/admin/ ; Flutter : apps/mobile/
- Fonctionnement Git et livraison : [guide](docs/operations/git-and-releases.md).
- Instructions agents : [AGENTS.md](AGENTS.md) et [CLAUDE.md](CLAUDE.md).
- Plans : [index](docs/plans/README.md).

## Développement

Depuis une copie propre du trunk à jour, créer une branche codex/<sujet> dans un worktree dédié. Installer avec pnpm install --frozen-lockfile. Vérifier avec npm run build, npm test et npm run smoke:production-contracts ; les contrôles API/admin sont également exécutés par GitHub Actions.

L’application reste sans framework. esbuild regroupe les modules au moment du build pour la livraison. Ne pas modifier dist/ : c’est une sortie générée.

Les fonctions présentes dans le code ne sont pas toutes validées en production : notamment paiement mobile money, assistant WhatsApp et publication native. Vérifier les preuves d’exécution avant toute annonce de disponibilité.
