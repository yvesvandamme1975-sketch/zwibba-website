# Zwibba Codex Deploy Handoff Design

**Date:** 2026-05-21

## Goal

Ajouter à `AGENTS.md` une règle 9 qui décrit le **mode d'auto-deploy conditionnel** attendu de Codex au terme d'une exécution réussie et vérifiée : push branch, ouverture et merge du PR via `gh`, sync de la branche de deploy, `railway up`, smoke HTTP post-deploy avec marqueur fonctionnel, et rollback automatique si le smoke échoue. Ce plan v1 **documente la règle** uniquement — le tooling concret (extension de la skill `zwibba-plan-writer` pour générer des tasks de deploy dans chaque implementation.md, plus le runtime que Codex appellera) viendra dans un plan v2 séparé.

## Problem

Aujourd'hui à la fin d'un run Codex, le hand-off vers le deploy est verbal et implicite (Yves merge le PR, dit "deploy maintenant", la skill `zwibba-plan-writer` Phase 4 prend le relais). Yves veut basculer vers un **système autonome** : Codex pousse le code en prod lui-même à la fin de chaque run réussi et vérifié, avec un garde-fou smoke HTTP + rollback pour ne pas casser la prod silencieusement.

Le mode choisi (validé le 2026-05-21) est **conditionnel** :
- Codex passe par un PR et un merge (pas de push direct sur `codex/website-vitrine-backup`), donc la trace GitHub reste disponible.
- Codex fait un smoke HTTP post-deploy sur l'URL prod et vérifie qu'un marqueur fonctionnel du plan est présent dans le code servi. Le marqueur est défini par chaque plan — par exemple pour `home-header-beta-badge`, le marqueur aurait été "le path `/assets/app/features/home/home-screen.mjs` retourne 200 ET contient `badge: 'Beta'`".
- Si le smoke échoue, Codex tente un rollback automatique via `railway redeploy <previous-deploy-id>` (le previous-id étant capturé avant le `railway up`), puis rapporte l'échec.

Sans règle écrite dans AGENTS.md, ce comportement n'a pas de cadre : Codex ne sait pas quand activer ce mode, quels critères stricts respecter, et où s'arrêter (refuser de toucher à `main`, ne pas push-force, ne pas rollback sans confirmation si la previous-id n'est pas la sienne, etc.). La règle 9 codifie ce contrat pour que toute future implémentation du tooling s'aligne.

Limite reconnue : la prod Zwibba est aujourd'hui en internal beta sans utilisateurs payants connectés. Un déploy cassé est récupérable rapidement (rollback Railway, ~30s). Si la situation change (utilisateurs externes, payments live), la règle 9 devra être durcie — review humaine systématique, fenêtre de deploy, etc. Ce plan v1 part du contexte actuel.

## Non-Goals

- **Pas d'implémentation du tooling.** Ce plan ajoute la règle 9 dans AGENTS.md mais ne modifie ni la skill `zwibba-plan-writer` (pour générer des tasks de deploy auto), ni la structure des implementation.md générés. Conséquence : à la fin de ce run, Codex aura une nouvelle règle dans son brief mais pas encore les moyens de l'exécuter. Le tooling vit dans un plan v2 séparé à scoper après validation de la règle.
- **Pas d'auto-deploy par Codex sur CE plan v1.** Ce plan suit le flow manuel actuel : Codex écrit la règle, le PR est créé, Yves merge, Phase 4 manuelle déclenchée via la skill. Sinon on testerait un mécanisme qu'on est précisément en train de spécifier — récursion non souhaitable.
- **Pas de push direct sans PR.** Même quand le tooling sera là, Codex devra toujours passer par PR + merge. Pas de raccourci `git push origin codex/website-vitrine-backup` sans merge.
- **Pas de modification du smoke marker dans les plans existants.** Les plans déjà mergés (PR #2, #4) ne sont pas re-écrits pour ajouter un smoke marker. La convention s'applique aux plans futurs.
- **Pas de modification de CLAUDE.md** — sync optionnelle dans un plan séparé si pertinent.
- **Pas de fenêtre horaire de deploy ni de blocage CI** : V1 part du principe que tout `npm test` vert vaut go. Si on veut durcir (par exemple ne pas auto-deploy le vendredi 17h), c'est V3+.

## Existing System

`AGENTS.md` au commit `a02216c` contient huit règles dans "## Execution rules for Codex" (lignes 75-86). La huitième est "No invented APIs." La section suivante est "## UX/UI conventions for App/" (lignes 88+).

`zwibba-plan-writer` skill (SKILL.md à 369 lignes) a une Phase 4 "Deploy Railway (après merge PR)" documentée, validée bout-en-bout le 2026-05-21 sur PRs #2 et #4 mergés. Mécanique éprouvée : `railway up --detach` depuis le worktree `browser-live` (link Railway hérité via `.git` partagé), polling JSON via parser Python custom (path `environments.edges[].node.serviceInstances.edges[].node.latestDeployment.status`), smoke HTTP sur `https://website-production-7a12.up.railway.app`, build Railway typique <60s.

Le PWA est servi sous `/assets/app/{features,components,services,...}/*.mjs`. Le smoke marker d'un plan doit cibler ce path pour vérifier qu'un changement App/ est bien live.

Pas d'auto-deploy GitHub configuré : `railway up` manuel reste nécessaire après merge.

Aucune règle actuelle dans AGENTS.md ne couvre le hand-off Codex → deploy. La règle 9 comble ce trou.

## Recommended Architecture

### 1. Position et numérotation

Ajouter une **règle 9** à la fin de la liste existante dans "## Execution rules for Codex", après la règle 8 ("No invented APIs.") et avant la ligne vide qui précède la section "## UX/UI conventions for App/". Pas de nouvelle section.

### 2. Texte de la règle 9

Formulation cible, prose dense en anglais, gras sur le titre court, format aligné sur les règles 1-8 :

> 9. **At the end of a successful and verified run, trigger conditional auto-deploy.** When all tasks are committed, the full test suite passes (`npm test` and any task-specific commands), and `git status --short` is empty: (a) push the feature branch to `origin`, (b) open a pull request via `gh pr create` targeting `codex/website-vitrine-backup`, (c) merge that PR via `gh pr merge --squash --delete-branch`, (d) checkout `codex/website-vitrine-backup` in the deploy worktree (`/Users/pc/zwibba-website-worktrees/browser-live`) and `git pull --ff-only`, (e) capture the current Railway deploy id as the rollback target (`railway status --json | jq` or equivalent), (f) run `railway up --detach`, (g) poll `railway status --json` until the new deployment reaches `SUCCESS` (timeout ~5 min), (h) perform an HTTP smoke on the production URL and on the plan-specific smoke marker (defined in the implementation doc; a `200` plus a substring check on a path under `/assets/app/...` is the typical shape), (i) if any of these steps fails, attempt `railway redeploy <previous-id>` to restore the prior deploy and report the failure in detail. Never push directly to `codex/website-vitrine-backup` without a PR, never push to `main`, never accept a deploy whose smoke check did not pass.

### 3. Convention de smoke marker

Chaque implementation.md généré par la skill `zwibba-plan-writer` devra (à partir du plan v2 qui ajoute le tooling) inclure une dernière task explicitement nommée "Deploy & smoke" qui définit le marqueur. Forme attendue :

> **Smoke marker:** path `/assets/app/features/home/home-screen.mjs` must return HTTP 200 and contain the substring `badge: 'Beta'`. The HTTP smoke must also confirm HTTP 200 on `/` and `/App/`.

Pour les plans doc-only (par exemple ce plan codex-deploy-handoff lui-même), le smoke marker se réduit à HTTP 200 sur `/` (pas de marqueur fonctionnel possible puisque la modif n'est pas servie par Railway). La règle 9 mentionne cette dégradation acceptable.

### 4. Capture du rollback target

Avant le `railway up`, Codex doit capturer le `latestDeployment.id` du service `website` via `railway status --json` parsé par python. Stocker dans une variable locale, par exemple `PREVIOUS_DEPLOY_ID=...`. Si le smoke post-deploy échoue, lancer `railway redeploy "$PREVIOUS_DEPLOY_ID"`. Ne pas tenter de rollback si le previous-id n'est pas capturable (par exemple Railway dans un état inattendu) — dans ce cas, juste rapporter l'échec sans tenter quoi que ce soit, et laisser Yves intervenir.

### 5. Format du rapport final

Le rapport final de Codex doit explicitement contenir :
- la liste des commits du plan
- les résultats des étapes a-h (succès/échec)
- le `RAILWAY_URL` et le code HTTP du smoke marker
- si rollback : la confirmation du rollback réussi et le previous-id restauré
- une ligne de hand-off finale : `Plan complete, deployed to <URL>, smoke OK.` ou `Plan implemented but deploy failed at step X — rolled back to <previous-id>.` ou `Plan implemented but deploy AND rollback failed — manual intervention required.`

### 6. Pointer croisé minimal

Ajouter dans "## Pointers across files" une phrase courte : "The zwibba-plan-writer skill orchestrates the four phases (plan design, implementation doc, codex exec, Phase 4 Railway deploy). Rule 9 above is the Codex-side counterpart that activates when the implementation doc includes a smoke marker."

### 7. Couverture par test

Étendre `tests/agents-md.test.mjs` (créé par PR #4) avec des asserts sur :
- la chaîne `trigger conditional auto-deploy` (ou un fragment équivalent comme `conditional auto-deploy`)
- la chaîne `smoke marker` (présence de la convention)
- la chaîne `railway redeploy` (mention du rollback)
- la chaîne `Never push directly to` (garde-fou explicite)

Test de présence uniquement — pas de test du comportement de Codex lui-même.

### 8. Plan v2 à scoper (out of scope ici)

Une fois la règle 9 mergée et stable, ouvrir un plan v2 `zwibba-plan-writer-auto-deploy-tooling` qui :
- étend la skill `zwibba-plan-writer` pour générer une task finale "Deploy & smoke" dans chaque implementation.md
- documente le format strict du smoke marker dans le SKILL.md
- factorise les scripts python de polling Railway et de smoke HTTP dans `.zwibba-plan-staging/` ou un emplacement plus pérenne
- ajoute un test sur la skill elle-même (s'il existe)
- est testé sur un plan réel (par exemple une mini-feature App/) pour valider que Codex sait exécuter la séquence a-i

Plan v2 ne démarre **qu'après** validation que la règle 9 est correctement écrite dans AGENTS.md (suite verte sur le test du point 7).
