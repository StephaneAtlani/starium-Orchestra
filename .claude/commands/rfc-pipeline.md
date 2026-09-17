---
description: Pipeline RFC autonome — plan → review → implement → conformité → docs → commit
argument-hint: [RFC-COMP-002 | conformité | suite]
---

Applique la skill orchestrateur **`starium-rfc-pipeline`** pour : **$ARGUMENTS**

Équivalent au lancement **direct** de la skill `starium-rfc-pipeline` (cette
commande n'est **pas** obligatoire).

1. Lis `.claude/skills/starium-rfc-pipeline/SKILL.md`.
2. Initialise ou relis `.claude/rfc-pipeline-state.json` :
   - nouveau run : capturer `baseline` + `preExistingDirty` une fois (immuables) ;
   - reprise : peupler `resumeObserved` seulement, ne jamais écraser l'état initial.
3. Pour l'étape courante (`features[active].stage`), lis et exécute le skill
   d'étape (`starium-step-plan` → `review-plan` → `implement` → `conformite` →
   `docs` → `commit`).
4. **Boucle continue** dans le même run : enchaîne les étapes sans attendre un
   nouveau message ; commit par feature si `commitPerFeature: true`.
5. Fin de backlog : `starium-release-gate` préprod (checks only, pas de push/deploy).
6. Stop uniquement sur pause user, `blocked` qualifié, ou `done` validé.
