# Plan — `comp-ev-6-reutilisation`

**RFC** COMP-004 EV.6 · Commit : `feat(compliance): reuse existing evidence on another requirement`

## Objectif
Picker labellisé pour rattacher une preuve existante du client à l’exigence courante (copie métadonnées).

## Décisions
1. **Copie** nouvelle ligne (nouvel id) : name/description/url/fileId/kind/collectedAt ; assessment = TO_REVIEW ; version = 1.
2. `GET /evidence/search?q=` scoped client, `isCurrent=true`, libellés (jamais ID).
3. `POST /evidence/reuse` body `{ sourceEvidenceId, requirementId }`.
4. UI : bouton « Réutiliser » + StariumModal recherche.

## Hors scope
Lien partagé (même id) · PROC · FILE upload

GO
