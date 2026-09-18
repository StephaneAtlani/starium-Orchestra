# Plan PROC-007 F1 — Settings + nav + UI cycle / validateurs

## Objectif

Espace Configuration Procédures : toggle cycle de pilotage + liste de validateurs (persistés par client), nav Catalogue / Configuration. **Sans** catégories table ni branchement transition (F2/F3).

## Décisions figées

B1=B, B2=B, B3=A, B4=A (voir RFC-PROC-007). F1 ne code que settings UI/API + perm ; transition mode Non = F3.

## Fichiers

### Backend
- `schema.prisma` — `ProcedureModuleSettings` (`clientId` unique, `usePilotageCycle` default true, `validatorUserIds String[]`)
- migration SQL
- `dto/update-procedure-settings.dto.ts`
- `procedure-settings.service.ts` (+ tests isolation)
- Controller routes **avant** `:id` : `GET/PATCH procedures/settings`
- seed : `procedures.configure` + CLIENT_ADMIN

### Frontend
- `navigation.ts` — children Catalogue + Configuration
- `app/(protected)/procedures/configuration/page.tsx`
- feature : api + component settings (switch, multi-select validateurs libellés)
- `procedure-query-keys` settings

## CA testables

- GET settings crée défaut si absent (`usePilotageCycle: true`, validators `[]`)
- PATCH refuse `usePilotageCycle: false` sans ≥ 1 validatorUserId membre du client
- PATCH exige `procedures.configure` ; isolation client
- Nav + page DS loading/error ; libellés métier
- `audit:ui-ids` OK

## Hors scope F1

- Table `ProcedureCategory` (F2)
- Adapter `transition` / boutons Soumettre / Approuver (F3)
- Notifications

## By design

RGPD: validator ids + displayName ; pas d’email en logs. RGAA: labels switch/select. DS: PageHeader/section. Sécurité: scope+RBAC. Mobile: stack 320px.

## Commit cible

`feat(procedures): add module settings config for pilotage cycle and validators`
