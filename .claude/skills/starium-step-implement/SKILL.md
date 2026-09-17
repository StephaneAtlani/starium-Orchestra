---
name: starium-step-implement
description: >-
  Étape IMPLEMENT du pipeline RFC Starium — code la fonctionnalité du plan
  validé (API + UI + tests). À utiliser quand l'étape courante est « implement »,
  ou quand l'utilisateur demande d'implémenter le plan RFC courant.
---

# Étape 3 — Implémentation

## Entrée

- Plan en statut GO (`planPath`)
- RFC liée
- Feature `stage: "implement"`
- Travailler dans l'espace isolé si dirty préexistant (voir orchestrateur / commit)

## Skills à lire avant de coder

1. `starium-rfc` — méthode complète (points 4–6)
2. Si UI : `starium-design-system`
3. Si modale / dialog : `starium-modales`

## Actions

1. Implémenter **strictement** le périmètre du plan (pas d'expansion).
2. Backend d'abord (DTO, service scopé client, controller, audit si sensible), puis frontend.
3. Prisma : `prisma generate` si client touché ; **migration SQL seulement si**
   le schéma de base change. **Exécuter soi-même** (ne jamais déléguer à
   l’utilisateur) :
   ```bash
   pnpm --filter @starium-orchestra/api prisma:generate
   # si migration créée :
   pnpm --filter @starium-orchestra/api prisma:migrate   # migrate deploy
   ```
   Vérifier le succès dans le run avant de passer à `conformite`.
4. Tests unitaires (isolation client, validations) ; tests UI si flux critique.
5. Vérifs minimales (ne remplacent pas `featureControls` de l'étape conformite) :
   ```bash
   pnpm --filter @starium-orchestra/api test -- <fichiers-ciblés>
   pnpm --filter @starium-orchestra/web exec tsc --noEmit -p tsconfig.json
   pnpm audit:ui-ids   # si UI
   pnpm audit:modals   # si modale
   ```
6. Ne pas committer ici.
7. Toute correction qui change le contenu → invalide `validatedTreeId` /
   `featureControls` passés (réexécution en conformite).

## Échec

Remonter à l'orchestrateur (retry ≤ 3 via `attempts.implement`) ; ne pas
s'arrêter en silence.

## Sortie

- Diff borné au plan
- Feature `stage: "conformite"` + miroir global
- Notes courtes : dettes / vigilance pour la review conformité

## Interdit

- Refactor hors plan
- Affaiblir permissions / retirer filtre client
- Afficher un ID technique
- Graphiques factices
- Commit (réservé à `starium-step-commit`)
- Modifier / écraser le travail préexistant (`preExistingDirty`)
