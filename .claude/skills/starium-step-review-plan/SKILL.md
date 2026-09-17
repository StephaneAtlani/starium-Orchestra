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

- Plan produit à l'étape 1
- RFC + état `.claude/rfc-pipeline-state.json`

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
- [ ] **Migration** : si Prisma, nom + impact backfill clarifiés

## Actions

1. Lire le plan et le differ mentalement avec le code réel (spot-check 2–5 fichiers).
2. Lister les **écarts** avec sévérité `block` / `nit`.
3. Si `block` : **amender le plan** (éditer le fichier plan) — ne pas passer à l'impl.
4. Si aucun `block` : marquer le plan **GO**.

## Sortie

- Verdict : `GO` | `NO-GO` + liste d'écarts
- Plan mis à jour si besoin
- État : `stage: "implement"` si GO, sinon rester `review-plan`

## Interdit

- Coder l'implémentation
- Commit
- Ignorer un `block` « pour avancer »
