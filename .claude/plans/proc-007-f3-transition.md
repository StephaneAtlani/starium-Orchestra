# Plan PROC-007 F3 — Transition mode Non (soumettre / approuver)

## Objectif

Brancher `POST …/transition` et l’UI éditeur sur `usePilotageCycle` : mode Non = auteur soumet (`DRAFT`→`IN_REVIEW`), validateur (liste) approuve (`IN_REVIEW`→`PUBLISHED`). États inchangés (B1=B).

## Décisions

- Cycle **Oui** : comportement actuel (`procedures.publish` pour publier).
- Cycle **Non** : publish exige acteur ∈ `validatorUserIds` **ou** CLIENT_ADMIN / platform admin (force). Pas d’exigence `procedures.publish` pour un validateur listé.
- Retour `IN_REVIEW`→`DRAFT` : `procedures.update` (retrait / refus).
- UI : libellés Soumettre / Approuver / Renvoi brouillon selon mode + droits.

## Fichiers

- `procedures.service.ts` — lire settings avant transition PUBLISHED
- tests transition mode Non
- `edit/page.tsx` — settings query + boutons labels / gating
- API.md + RFC statut F3 ✅

## CA

1. Cycle on + publish sans `procedures.publish` → 403
2. Cycle off + publish hors liste → 403
3. Cycle off + validateur → 200 PUBLISHED
4. CLIENT_ADMIN hors liste → OK force
5. UI labels + gating ; `audit:ui-ids` OK

## Hors scope

- Notifications validateurs
- Workflow multi-étapes

## Commit

`feat(procedures): enforce validator approval when pilotage cycle is off`
