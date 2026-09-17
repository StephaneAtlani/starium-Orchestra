---
name: starium-step-conformite
description: >-
  Étape CONFORMITE du pipeline RFC Starium — revue qualité multi-client, RBAC,
  by-design, audits. À utiliser juste après l'implémentation d'une feature RFC,
  avant doc/commit, ou quand l'étape pipeline est « conformite ».
---

# Étape 4 — Conformité

## Entrée

- Diff de l'étape implement
- État `stage: "conformite"`

## Action principale

**Lire et appliquer intégralement** la skill `.claude/skills/starium-conformite/SKILL.md`.

Compléments pipeline :

1. Si UI touchée : lancer aussi `starium-ui-reviewer` (agent) ou checklist DS/RGAA/mobile de
   `starium-design-system`.
2. Si modale : `pnpm audit:modals` + skill `starium-modales`.
3. Toujours : `pnpm audit:ui-ids` si `apps/web` modifié.

## Sortie

- Verdict : `OK` | `ÉCARTS` (liste `fichier:ligne` + fix)
- Si `ÉCARTS` : **corriger** avant de passer à docs/commit ; re-run checks
- État : `stage: "docs"` seulement si OK (ou écarts nits non bloquants documentés)

## Interdit

- Commit tant qu'il reste un écart bloquant (isolation, authz, ID en UI, secret)
