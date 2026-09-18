# Plan — `comp-ev-3-appreciation`

**RFC** COMP-004 EV.3 · Commit : `feat(compliance): evidence assessment badges in requirement drawer`

## Objectif
Afficher et modifier l’appréciation (`TO_REVIEW` / `RELEVANT` / `PARTIAL` / `INSUFFICIENT`) sur chaque preuve courante.

## Décisions
1. Select labellisé FR inline (pas de nouvelle modale).
2. PATCH existant `patchComplianceEvidence`.
3. Badge + select (info pas couleur seule).

## Fichiers
- `lib/compliance-evidence-assessment.ts` + spec
- `compliance-assess-drawer-body.tsx` — select si canUpdate
- modal — mutation assessment

GO
