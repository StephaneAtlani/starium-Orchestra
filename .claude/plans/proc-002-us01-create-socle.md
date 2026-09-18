# Plan — US-PROC-01 Socle + créer procédure

**RFC** : RFC-PROC-002 · **Feature** : `proc-002-us01-create-socle`  
**Commit cible** : `feat(procedures): create client-scoped procedures with draft version`

## Objectif

Permettre à un utilisateur autorisé du client actif de **créer** une procédure (métadonnées + brouillon v1 vide), avec isolation multi-client, RBAC et audit.

## Analyse existant

- Aucun modèle / module `procedures` (greenfield).
- Miroir : `skills` (guards Jwt+ActiveClient+ModuleAccess+Permissions, seed `ensure*ModuleAndPermissions`, FE list/modal).
- Unique `code` : pattern `ActivityType` / `WorkTeam` `@@unique([clientId, code])`.
- TipTap absent → hors scope de cette feature (US-02).

## Hypothèses figées

1. `versionNumber` entier démarre à **1** en DRAFT.
2. Catégories = enum Prisma fixe (PROC-002 §3).
3. Owner = `ownerUserId` optionnel, UI libellé via users client (jamais ID).
4. Redirect post-create → `/procedures/[id]/edit` (page stub lecture métadonnées + empty « contenu riche US-02 »).
5. Liste catalogue minimale (`GET /api/procedures`) pour ne pas bloquer la nav ; filtres avancés = US-04.
6. `ProcedureAsset` dans le schéma (relation vide) pour éviter une 2e migration destructive — pas d’API assets ici.

## Fichiers

### Prisma / seed
- `apps/api/prisma/schema.prisma` — enums + `Procedure` + `ProcedureVersion` + `ProcedureAsset`
- migration `procedures_module_init`
- `apps/api/prisma/seed.ts` — `ensureProceduresModuleAndPermissions` + rôle CLIENT_ADMIN
- `apps/api/prisma/default-profiles.json` — `procedures.*` sur profils gouvernance

### API
- `apps/api/src/modules/procedures/` — module, controller, service, dto/, tests/
- `apps/api/src/app.module.ts` — import
- Audit actions `procedure.created`

### Web
- `apps/web/src/features/procedures/` — api, query-keys, types, create dialog/form
- `apps/web/src/app/(protected)/procedures/page.tsx` — liste minimale
- `apps/web/src/app/(protected)/procedures/new/page.tsx` **ou** modal depuis liste
- `apps/web/src/app/(protected)/procedures/[id]/edit/page.tsx` — stub post-create
- `apps/web/src/config/navigation.ts` — entrée Gouvernance › Procédures

## Critères d’acceptation

1. POST crée procédure `DRAFT` + version DRAFT `versionNumber=1` contentJson `{}` / doc vide TipTap-compatible.
2. Code unique par client → 409.
3. `clientId` dérivé du scope uniquement.
4. Permissions `procedures.create` / `procedures.read` enforced.
5. Audit `procedure.created`.
6. UI : formulaire code/titre/description/catégorie/propriétaire (libellés) ; redirect edit ; aucun ID visible.
7. Tests service : isolation cross-client + conflit code + create happy path.

## Hors scope

- Éditeur riche / assets upload (US-02)
- Archive (US-03)
- Filtres avancés catalogue (US-04)
- Publish / export (PROC-003/004)
- Pont conformité

## By design

| Standard | Mesure |
|---|---|
| RGPD | Owner/créateur = userId ; pas d’email en logs audit ; rétention = archivage logique ultérieur |
| RGAA | Labels, focus, aria sur formulaire/modale |
| DS | PageHeader, StariumModal, tokens, loading/empty/error |
| Sécurité | Guards + DTO + isolation client + audit |
| Mobile | Formulaire empilé, cibles ≥ 44px |

## Contrôles feature

- `pnpm --filter @starium-orchestra/api test -- procedures`
- `pnpm --filter @starium-orchestra/api exec tsc --noEmit`
- `pnpm --filter @starium-orchestra/web exec tsc --noEmit`
- `pnpm audit:ui-ids`
- `pnpm audit:modals`
