---
name: starium-step-implement
description: >-
  Étape IMPLEMENT du pipeline RFC Starium — code la fonctionnalité du plan
  validé (API + UI + tests). À utiliser quand l'étape courante est « implement »,
  ou quand l'utilisateur demande d'implémenter le plan RFC courant.
---

# Étape 3 — Implémentation

## Entrée

- Plan en statut GO
- RFC liée
- État `stage: "implement"`

## Skills à lire avant de coder

1. `starium-rfc` — méthode complète (points 4–6)
2. Si UI : `starium-design-system`
3. Si modale / dialog : `starium-modales`

## Actions

1. Implémenter **strictement** le périmètre du plan (pas d'expansion).
2. Backend d'abord (DTO, service scopé client, controller, audit si sensible), puis frontend.
3. Prisma + migration si prévu ; `prisma generate` après.
4. Tests unitaires (isolation client, validations) ; tests UI si flux critique.
5. Vérifs minimales :
   ```bash
   pnpm --filter @starium-orchestra/api test -- <fichiers-ciblés>
   # et/ou web
   pnpm --filter @starium-orchestra/web exec tsc --noEmit -p tsconfig.json
   pnpm audit:ui-ids   # si UI
   pnpm audit:modals   # si modale
   ```
6. Ne pas committer ici — étape suivante = conformité puis docs puis commit.

## Sortie

- Diff propre, borné
- Tests verts sur le périmètre
- État : `stage: "conformite"`
- Notes courtes : dettes / points de vigilance (pour la review conformité)

## Interdit

- Refactor hors plan
- Affaiblir permissions / retirer filtre client
- Afficher un ID technique
- Graphiques factices
- Commit (réservé à `starium-step-commit`)
