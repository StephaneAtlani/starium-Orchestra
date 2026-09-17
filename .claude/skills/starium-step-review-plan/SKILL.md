---
name: starium-step-review-plan
description: >-
  Étape REVIEW-PLAN du pipeline RFC Starium — relit et amende un plan avant
  implémentation (scope, isolation client, DoD, hors-scope). À utiliser quand
  l'étape courante est « review-plan », ou quand l'utilisateur demande de
  challenger / valider un plan RFC.
---

# Étape 2 — Review du plan

## Entrée

- Plan produit à l'étape 1 (`planPath` sur la feature)
- RFC + état `.claude/rfc-pipeline-state.json`
- Feature `stage: review-plan`

## Checklist review (bloquante)

- [ ] **1 feature** : le plan ne mélange pas 2 livraisons indépendantes
- [ ] **Isolation client** : lectures/écritures scopées ; pas de `clientId` payload brut
- [ ] **AuthZ** : permissions / guards nommés
- [ ] **API-first** : pas de logique métier UI seule
- [ ] **Libellés** : jamais d'ID en UI ; champs `name`/`title`/`label` prévus
- [ ] **DS / mobile / RGAA** : composants existants, loading/empty/error, cibles ≥ 44px
- [ ] **Tests** : cas isolation + happy path listés
- [ ] **Hors scope** : explicite et respecté
- [ ] **Décisions figées** : aucune option A/B ouverte dans le plan
- [ ] **Migration Prisma** : seulement si schéma DB modifié ; nom + impact clarifiés

## Actions

1. Lire le plan et spot-check 2–5 fichiers du code réel.
2. Lister les **écarts** avec sévérité `block` / `nit`.
3. Si `block` : **amender le plan** — rester en `review-plan`.
4. Si aucun `block` : marquer le plan **GO**.

## Sortie

- Verdict : `GO` | `NO-GO` + liste d'écarts
- Si GO : feature `stage: "implement"` + `stage` global miroir
- Si NO-GO : rester `review-plan` (ou `blocked` si arbitrage métier requis —
  remonter à l'orchestrateur)

## Interdit

- Coder l'implémentation
- Commit
- Ignorer un `block` « pour avancer »
