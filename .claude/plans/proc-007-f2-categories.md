# Plan PROC-007 F2 — ProcedureCategory table + UI

## Objectif

Remplacer l’enum figé `ProcedureCategory` par un référentiel client `ProcedureCategory` (code, libellé, ordre, actif), exposé en API + section Configuration, consommé par catalogue / create / edit.

## Décisions figées

B3=A. Seed 5 codes historiques (PILOTAGE…). Soft-disable si procédures liées. F3 hors scope.

## Schéma

- Drop enum Prisma `ProcedureCategory`
- Model `ProcedureCategory` : `id`, `clientId`, `code` (unique/client), `label`, `sortOrder`, `isActive`, timestamps
- `Procedure.categoryId` FK (NOT NULL) — remplace colonne enum `category`
- Migration : table + seed 5 cats par client existant + remap procédures + drop enum
- Ensure-defaults à la lecture (clients sans lignes) pour ne pas bloquer les nouveaux clients

## API

Routes **avant** `:id` :
- `GET /procedures/categories` — liste (query `activeOnly?`) — `procedures.read`
- `POST /procedures/categories` — `{ label, code? }` — `procedures.configure`
- `PATCH /procedures/categories/:categoryId` — `{ label?, sortOrder?, isActive? }` — configure ; désactivation refusée si procédures actives liées **400** métier
- Create/Update/List procédures : `categoryId` (+ réponse enrichie `{ id, code, label }`)

## Frontend

- Section Catégories dans `procedure-settings-panel` (CRUD soft)
- Create dialog + editor + catalog : options depuis API actives ; `displayLabel` / jamais ID
- Types : retirer union enum figée ; garder fallback libellé « Catégorie inconnue »

## CA testables

1. Migration + generate OK ; procédures existantes remapées
2. GET categories seed défauts 5 si vide
3. POST crée code unique/client ; conflit **409**
4. PATCH isActive=false refusé si usage
5. Create procedure exige categoryId actif du client
6. UI config + selects libellés ; `audit:ui-ids` 0
7. Isolation client sur toutes les queries

## Hors scope

- Transition publish mode Non (F3)
- Drag-and-drop reorder avancé (PATCH sortOrder suffit)
- Notifications

## By design

RGPD: pas de DCP. RGAA: labels liste. DS: starium-section. Sécurité: configure + scope. Mobile: stack.

## Commit cible

`feat(procedures): replace category enum with client-scoped ProcedureCategory`
