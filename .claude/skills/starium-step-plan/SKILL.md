---
name: starium-step-plan
description: >-
  Étape PLAN du pipeline RFC Starium — produit un plan d'implémentation borné
  (1 fonctionnalité) à partir d'une RFC / écarts MVP. À utiliser quand l'étape
  courante est « plan », ou quand l'utilisateur demande de planifier une feature
  RFC avant code.
---

# Étape 1 — Plan

## Entrée

- RFC cible (`docs/RFC/RFC-*.md`) + `docs/RFC/_RFC Liste.md`
- Écarts éventuels (`*-ecarts-mvp.md`)
- État pipeline : `.claude/rfc-pipeline-state.json`
- Feature active : `status: in_progress`, `stage: plan`

## Actions (obligatoires)

1. **Lire** la RFC + écarts + code existant minimal (grep / fichiers cités).
2. **Appliquer** la méthode de `starium-rfc` pour les points 1–3 uniquement :
   analyse de l'existant · hypothèses · liste des fichiers.
3. **Découper** en **une seule** fonctionnalité livrable (pas toute la RFC si large).
4. **Rédiger** un plan Cursor (CreatePlan) ou un bloc plan markdown avec :
   - objectif métier (1–2 phrases)
   - fichiers à créer / modifier
   - migrations Prisma **seulement si** modification du schéma DB
   - critères d'acceptation testables
   - hors scope explicite
   - risques / décisions figées (pas d'option A/B non tranchée)
5. **Conformité by design** : une ligne par standard (RGPD, RGAA, DS, Sécurité, mobile).

## Sortie

- Plan approuvable (`planPath`)
- Proposition de message de commit cible (1 ligne, style repo)
- Mettre à jour la feature active :
  - `planPath`, `stage: "review-plan"`
  - miroir `stage` global = `review-plan`
- Invalider tout `featureControls` / `validatedTreeId` d'une run antérieure sur
  cette feature si le plan change le périmètre de contenu.

## Interdit

- Modifier le code applicatif
- Commit
- Implémenter « en avance »
- Écraser `baseline` / `preExistingDirty`
