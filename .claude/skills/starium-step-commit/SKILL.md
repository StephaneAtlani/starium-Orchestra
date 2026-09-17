---
name: starium-step-commit
description: >-
  Étape COMMIT du pipeline RFC Starium — commit git isolé par fonctionnalité
  (contenu exact, tree vs validatedTreeId, pas de push). À utiliser quand
  commitPerFeature est true ou l'utilisateur demande explicitement de committer
  la feature courante.
---

# Étape 6 — Commit (1 feature = 1 commit)

## Prérequis

- Implement + conformité OK (`validatedTreeId` présent) ; docs si applicable
- Autorisation : **`commitPerFeature === true`** dans l'état pipeline **ou**
  demande explicite utilisateur (« commit », « committe la feature »)
- Sinon → `blocked` « autorisation commit » (remonter orchestrateur)

## Isolation (obligatoire)

1. Respecter `preExistingDirty` immuable (capturé au démarrage du run) — ne
   jamais l'écraser ni l'embarquer.
2. Si chevauchement de fichiers / index déjà rempli : utiliser le mécanisme
   d'isolation documenté par l'orchestrateur (worktree dédié ou stash/index
   temporaire) pour n'inclure **que** le delta feature.
3. **Jamais** `git add -A`.
4. La sélection de chemins seule est **insuffisante** — vérifier le **contenu**
   exact (`git diff --cached`) contre le plan.

## Protocole

1. Snapshot :
   ```bash
   git status -sb
   git diff
   git diff --cached
   git log -5 --oneline
   ```
2. Stager uniquement le delta feature isolé.
3. Relire `git diff --cached` : contenu = plan ; aucun fichier de
   `preExistingDirty` non intentionnellement feature.
4. Noter `HEAD_BEFORE=$(git rev-parse HEAD)`.
5. Commit HEREDOC (message style repo, focus why) :
   ```bash
   git commit -m "$(cat <<'EOF'
   feat(scope): …

   EOF
   )"
   ```
6. Hook en échec :
   - Comparer `HEAD` avant/après.
   - Si nouveau commit créé → **ne pas** retenter un second commit feature ;
     valider l'arbre ; follow-up si besoin.
   - Si `HEAD` inchangé → corriger → **nouveau** commit (pas amend sauf règles
     user).
7. Après commit réussi :
   - `TREE=$(git rev-parse HEAD^{tree})`
   - Exiger `TREE == validatedTreeId` (ou égalité avec l'arbre validé de
     l'espace isolé). Sinon corriger / revalider avant `completed`.
   - Enregistrer `commitHash` ; ne pas invalider les contrôles si seul le SHA
     commit change sans delta d'arbre.
8. Commit complémentaire (fix post-gate, etc.) :
   - Après revalidation du nouvel arbre, pousser le hash dans
     `followUpCommitHashes` ; la référence livrée = **dernier** état (pas le
     seul `commitHash` initial) ; mettre à jour `validatedTreeId` si contenu
     changé.

## Règles

- **Jamais** `git push` sauf demande explicite séparée
- **Jamais** `--no-verify` / force push / amend sauf conditions user
- Un commit principal = une fonctionnalité du plan

## Échec

Remonter à l'orchestrateur (`attempts.commit` ≤ 3) ; ne pas s'arrêter en silence.

## Sortie

- `commitHash` (+ éventuels `followUpCommitHashes`)
- Feature `status: completed` **seulement** si validations OK pour l'arbre
  livré ; `stage` feature peut rester `commit` ou null
- Orchestrateur : sélectionne la feature suivante → `plan`, ou fin de backlog
  → release-gate (`backlogControls`)

## Après commit

L'orchestrateur enchaîne (boucle continue) : feature suivante ou contrôles de fin.
