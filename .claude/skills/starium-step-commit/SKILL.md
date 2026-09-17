---
name: starium-step-commit
description: >-
  Étape COMMIT du pipeline RFC Starium — crée un commit git par fonctionnalité
  livrée (message style repo, pas de push). À utiliser uniquement quand le
  pipeline RFC autorise les commits par feature, ou l'utilisateur demande
  explicitement de committer la feature courante.
---

# Étape 6 — Commit (1 feature = 1 commit)

## Prérequis

- Étapes implement + conformité OK (+ docs si comportement documenté)
- Autorisation : pipeline `starium-rfc-pipeline` en cours **ou** demande explicite
  utilisateur (« commit », « committe la feature »)

## Protocole git (strict)

1. En parallèle :
   ```bash
   git status -sb
   git diff
   git log -5 --oneline
   ```
2. Stager **uniquement** les fichiers de la feature (pas de `.env`, secrets).
3. Commit via HEREDOC, message 1–2 phrases focus **why**, style du repo :
   ```bash
   git commit -m "$(cat <<'EOF'
   feat(compliance): …

   EOF
   )"
   ```
4. `git status` pour vérifier.
5. Si hook échoue : corriger → **nouveau** commit (pas amend sauf règles user).

## Règles

- **Jamais** `git push` sauf demande explicite séparée
- **Jamais** `--no-verify` / force push / amend sauf conditions user
- Un commit = une fonctionnalité du plan (pas un mega-commit multi-RFC)

## Sortie

- Hash / message du commit
- État pipeline :
  - si backlog RFC non vide → `stage: "plan"`, incrémenter `featureIndex`
  - sinon → `stage: "done"`

## Après commit

- Ne pas enchaîner la feature suivante **sans** repasser par `starium-step-plan`
  (sauf si l'orchestrateur le fait explicitement).
