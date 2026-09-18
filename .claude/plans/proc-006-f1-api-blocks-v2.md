# Plan F1 — PROC-006 API blocs v2 + IN_REVIEW + transition

**Feature** : F1 · **RFC** : PROC-006 · **Commit cible** : `feat(proc): contentJson v2 blocks, IN_REVIEW, transition publish`

## Objectif

Remplacer TipTap `contentJson` par blocs v2, ajouter `IN_REVIEW` + catégories mock, endpoint `POST …/transition` (publish immuable), wipe données existantes.

## Fichiers

- `apps/api/prisma/schema.prisma` + migration `proc_006_blocks_status_categories`
- `lib/procedure-content.util.ts` (+ sanitize HTML)
- `dto/update-procedure-draft.dto.ts`, `dto/transition-procedure.dto.ts`
- `procedures.service.ts`, `procedures.controller.ts`
- `procedure-assets.constants.ts` (svg si besoin)
- tests service + content util
- FE types/labels minimaux pour ne pas casser le build (`procedure.types.ts`, `procedure-labels.ts`, `procedure-content.ts`)

## Prisma

- `ProcedureStatus` += `IN_REVIEW`
- `ProcedureCategory` → `PILOTAGE|COMPLIANCE|FINANCE|ORGANISATION|SECURITY` + remap SQL
- UPDATE all `contentJson` → EMPTY_V2

## CA

- assert v2 only ; refuse TipTap doc
- transition matrice PROC-006
- isolation client
- publish = snapshot + nouveau draft
- sanitize rejette javascript:/styles

## Hors scope

UI liste/éditeur/schéma (F2–F5) ; export ; restore version US-06

## By design

RGPD: audit sans JSON complet · RGAA: n/a API · DS: n/a · Sécu: guards+DTO · Mobile: n/a
