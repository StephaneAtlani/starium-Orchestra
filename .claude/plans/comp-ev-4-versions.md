# Plan — `comp-ev-4-versions`

**RFC** COMP-004 EV.4 · Commit : `feat(compliance): create evidence version from requirement drawer`

## Objectif
CTA « Nouvelle version » sur preuve courante → `POST …/versions` ; libellé vN (courante).

## Décisions
1. Pas d’historique archivées dans le tiroir V1 (liste = isCurrent only) — hint « vN » suffisant.
2. Confirmation courte StariumModal avant versionner.
3. API existante.

GO
