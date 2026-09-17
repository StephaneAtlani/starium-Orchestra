---
description: Pipeline RFC autonome — plan → review → implement → conformité → docs → commit
argument-hint: [RFC-COMP-002 | conformité | suite]
---

Applique la skill orchestrateur **`starium-rfc-pipeline`** pour : **$ARGUMENTS**

1. Lis `.claude/skills/starium-rfc-pipeline/SKILL.md`.
2. Initialise ou relis `.claude/rfc-pipeline-state.json`.
3. Pour l'étape courante, lis et exécute **uniquement** le skill d'étape correspondant
   (`starium-step-plan` → `review-plan` → `implement` → `conformite` → `docs` → `commit`).
4. Enchaîne les étapes ; commit par feature si `commitPerFeature: true`.
5. Sur ambiguïté produit : `stage: blocked` et stop.
