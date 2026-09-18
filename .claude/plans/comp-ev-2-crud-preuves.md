# Plan — `comp-ev-2-crud-preuves`

**RFC** : COMP-004 EV.2 · **Commit** : `feat(compliance): soft-delete and edit compliance evidence`

## Objectif

Permettre d’éditer le nom/description d’une preuve et de la retirer (soft : `isCurrent=false`) avec confirmation accessible.

## Décisions

1. Soft-delete = `isCurrent=false` (pas de migration `archivedAt`).
2. Pas de 409 snapshot en V1 (preuves figées restent dans payload historique).
3. Édition via `StariumModal` ; retrait via `StariumModal` confirmation.
4. Pas d’appréciation ici (→ EV.3).

## Fichiers

- API : `deleteEvidence` + audit `EVIDENCE_ARCHIVED` · controller DELETE · tests
- Web : `deleteComplianceEvidence` · boutons Éditer/Retirer · 2 petites modales

## Acceptation

1. DELETE soft → disparaît de la liste (isCurrent filter).
2. PATCH name/description via UI.
3. Confirmation retirer a11y.
4. Tests service + audits verts.

GO
