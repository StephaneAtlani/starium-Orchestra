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
- État pipeline si présent : `.claude/rfc-pipeline-state.json`

## Actions (obligatoires)

1. **Lire** la RFC + écarts + code existant minimal (grep / fichiers cités).
2. **Appliquer** la méthode de `starium-rfc` pour les points 1–3 uniquement :
   analyse de l'existant · hypothèses · liste des fichiers.
3. **Découper** en **une seule** fonctionnalité livrable (pas toute la RFC si large).
4. **Rédiger** un plan Cursor (CreatePlan) ou un bloc plan markdown avec :
   - objectif métier (1–2 phrases)
   - fichiers à créer / modifier
   - migrations Prisma si besoin
   - critères d'acceptation testables
   - hors scope explicite
   - risques / décisions figées (pas d'option A/B non tranchée)
5. **Conformité by design** : une ligne par standard (RGPD, RGAA, DS, Sécurité, mobile) dans le plan.

## Sortie

- Plan approuvable (chemin du plan ou contenu)
- Proposition de message de commit cible (1 ligne, style repo)
- Mettre à jour `.claude/rfc-pipeline-state.json` :
  `stage: "review-plan"`, `featureSlug`, `rfcId`, `planPath`

## Interdit

- Modifier le code applicatif
- Commit
- Implémenter « en avance »
