# Plan — `comp-ev-5-reference-meta`

**RFC** COMP-004 EV.5 · Commit : `feat(compliance): persist REFERENCE evidence kind and collection meta`

## Objectif
Kind `REFERENCE` distinct (API+UI), date de collecte saisissable, auteur affiché (libellé).

## Décisions figées
1. REFERENCE = `name` + `description` obligatoires ; `url` optionnelle ; **pas** de FK PROC (module Draft).
2. Colonne Prisma `kind String?` (URL|OBSERVATION|FILE|REFERENCE) ; legacy null → dérivation actuelle.
3. `collectedAt` à la création (défaut = now si absent).
4. `createdByLabel` enrichi côté détail exigence (lookup User, jamais d’ID en UI).

## Fichiers
- Prisma schema + migration SQL
- DTO create (+ REFERENCE, collectedAt)
- `derive` / create / detail map + tests
- FE : kind REFERENCE dans API types, formulaire + méta auteur

## Acceptation
1. POST kind=REFERENCE sans description → 400
2. Détail renvoie `kind: REFERENCE`, `collectedAt`, `createdByLabel`
3. Menu Référence crée une REFERENCE ; méta affiche type · date · auteur
4. Tests + migrate + audits verts

## Hors scope
PROC picker · EV.6 réutilisation · FILE upload

GO
