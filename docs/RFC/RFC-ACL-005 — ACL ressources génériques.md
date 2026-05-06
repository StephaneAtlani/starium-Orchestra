# RFC-ACL-005 — ACL ressources génériques

## Statut

✅ **Implémentée (backend MVP)** — Prisma, migration, `AccessControlService`, API admin client ` /api/resource-acl/...`, `ResourceAclGuard` + décorateur `@RequireResourceAcl`, tests unitaires ; pas d’UI cockpit ACL (RFC-ACL-007) ; pas de branchement sur routes métier (RFC-ACL-006).

## 1. Analyse de l’existant

Le RBAC contrôle l’accès fonctionnel global, mais ne permet pas d’exprimer un droit fin par ressource spécifique (ex: projet sensible visible uniquement par certains sujets).

## 2. Hypothèses éventuelles

- Les sujets ACL supportés en V1 sont `USER` et `GROUP`.
- La règle de compatibilité ascendante est impérative : absence d’ACL => comportement actuel conservé.
- Une ACL explicite bascule en mode restrictif.
- **V1** : `resourceType` fichier sur une **whitelist** stricte (`PROJECT`, `BUDGET`, `RISK`, `DOCUMENT`, `GOVERNANCE_CYCLE`, `STRATEGIC_OBJECTIVE`), normalisation uppercase ; `resourceId` validé en **CUID** ; `PUT` avec jeu d’entrées **vide interdit** (pas de « reset » via `PUT []` — route dédiée hors périmètre).
- **CLIENT_ADMIN** : mode **strict** sur l’accès métier derrière `ResourceAclGuard` (pas de contournement selon le rôle) ; les routes `/api/resource-acl/...` restent réservées aux **CLIENT_ADMIN** (`ClientAdminGuard`).
- **Hiérarchie** : `READ` < `WRITE` < `ADMIN` ; `WRITE` couvre la lecture pour la garde lecture ; `ADMIN` couvre lecture et écriture pour les niveaux inférieurs ; `canAdminResource` n’accepte que `ADMIN`.

## 3. Liste des fichiers à créer / modifier

- `apps/api/prisma/schema.prisma` — modèle `ResourceAcl`, enums `ResourceAclSubjectType`, `ResourceAclPermission`, relation `Client.resourceAcls`.
- `apps/api/prisma/migrations/20260510120000_acl_005_resource_acl/migration.sql`
- `apps/api/src/modules/access-control/access-control.module.ts`
- `apps/api/src/modules/access-control/access-control.service.ts`
- `apps/api/src/modules/access-control/access-control.service.spec.ts`
- `apps/api/src/modules/access-control/resource-acl.constants.ts` — whitelist `resourceType` V1, regex CUID.
- `apps/api/src/modules/access-control/resource-acl.controller.ts`
- `apps/api/src/modules/access-control/dto/resource-acl-entry.dto.ts`
- `apps/api/src/modules/access-control/decorators/require-resource-acl.decorator.ts`
- `apps/api/src/modules/access-control/guards/resource-acl.guard.ts`
- `apps/api/src/modules/access-control/guards/resource-acl.guard.spec.ts`
- `apps/api/src/app.module.ts` — import de **`AccessControlModule`** au même titre que les autres modules API (pas via `CommonModule`, pour éviter couplages / cycles).
- `apps/api/src/modules/access-groups/access-groups.service.ts` — `deleteGroup` : transaction `ResourceAcl` (`subjectType = GROUP`, `subjectId` = id du groupe) puis suppression du groupe.

## 4. Implémentation complète

### Données et API

- Modèle **`ResourceAcl`** (une ligne = une entrée) ; contrainte unique `(clientId, resourceType, resourceId, subjectType, subjectId)` ; index `(clientId, resourceType, resourceId)`.
- Endpoints (tous sous **`JwtAuthGuard` + `ActiveClientGuard` + `ClientAdminGuard`**, client actif obligatoire) :
  - `GET /api/resource-acl/:resourceType/:resourceId` — `{ restricted, entries[] }` avec `subjectLabel` pour affichage métier.
  - `PUT /api/resource-acl/:resourceType/:resourceId` — body `{ entries }` ; **remplacement atomique** après validation (dont interdiction tableau vide, dédoublonnage sujets, sujets valides client) ; transaction `deleteMany` + `createMany`.
  - `POST /api/resource-acl/:resourceType/:resourceId/entries` — création unitaire ; **409** si conflit unique.
  - `DELETE /api/resource-acl/:resourceType/:resourceId/entries/:entryId` — **204** ; suppression uniquement si **id + clientId + resourceType normalisé + resourceId URL** matchent (**404** sinon — pas de suppression par `entryId` seul hors contexte ressource).

### Service et garde

- **`AccessControlService`** : `resolveResourceAclRoute` (validation unique utilisée avant toute lecture/écriture Prisma pour une paire route), helpers `parse*`, `loadAclPayload…` interne avec **`resourceType` déjà whitelist / uppercase**, `assertSubjectInClient`, `listEntries`, `replaceEntries`, `addEntry`, `removeEntry`, `canReadResource` / `canWriteResource` / `canAdminResource` (pas d’entrées => **autoriser** ; mode restreint => agrégation **max** USER + GROUP membres).

- **`ResourceAclGuard`** + **`@RequireResourceAcl({ operation })`** : résout la route via **`resolveResourceAclRoute`** comme les endpoints HTTP ; paramètres `resourceTypeParam` / `resourceIdParam` optionnels pour RFC-ACL-006 ; sans métadonnée, la garde est **transparente**. **Aucun branchement** sur contrôleurs métier dans cette livraison.

### Audit (mutations)

- Actions : `resource_acl.replaced`, `resource_acl.entry_created`, `resource_acl.entry_deleted` (`resourceType` ligne journal = `resource_acl`, champ `resourceId` = identifiant métier ciblé).
- **`resource_acl.replaced`** : `oldValue` / `newValue` structurés avec `aclResourceType`, `resourceId`, `restricted`, `entryCount`, `entries[]` snapshots (`id`, `subjectType`, `subjectId`, `permission`, timestamps ISO UTC pour diff / fouille hors `Date`).
- **`resource_acl.entry_deleted`** : `oldValue.entriesBeforeSnapshot` (entrée supprimée), `newValue.remainingEntryCount`, `restrictedAfter`, `removedEntryId`.

## 5. Modifications Prisma si nécessaire

- Enums **`ResourceAclSubjectType`** (`USER`, `GROUP`), **`ResourceAclPermission`** (`READ`, `WRITE`, `ADMIN`).
- Modèle **`ResourceAcl`** + contrainte unique composite + index.

## 6. Tests

Couverture livrée (unitaire) : absence d’ACL / mode restreint, hiérarchie READ/WRITE/ADMIN, **CLIENT_ADMIN** sans entrée applicable refusé en restreint, `PUT` vide / doublons / sujet invalide sans transaction, remplacement valide, **DELETE** hors contexte ressource sans suppression, nettoyage **`ResourceAcl`** à la suppression de groupe, garde sans décorateur et refus si `canRead` false.

À compléter avec l’intégration métier (**RFC-ACL-006**) : E2E par module, listings filtrés, etc.

## 7. Récapitulatif final

La RFC livre un moteur ACL transversal qui complète le RBAC sans régression sur les ressources non restreintes ; l’application aux routes/projets réels suit **RFC-ACL-006** ; l’UI d’administration dédiée **RFC-ACL-007**.

## 8. Points de vigilance

- **`resourceType` normalisé (whitelist uppercase) avant tout `where` Prisma** ; chemin commun `resolveResourceAclRoute` (GET/PUT/POST/DELETE + garde).
- Toujours valider l’appartenance client des sujets ACL.
- Contrat générique **`resourceType`** (whitelist V1) + **`resourceId`** (CUID) ; pas de vérification d’existence métier en RFC-005.
- Auditer toute mutation ACL (bulk et entrée unitaire).
- **DELETE** et **PUT** — ne pas affaiblir les critères de correspondance (`clientId`, type normalisé, `resourceId` URL).
- Extension whitelist `resourceType` : **RFC-ACL-006** avec mapping modules canoniques.

La synthèse des règles produit V1 (dont PUT vide interdit et strict CLIENT_ADMIN) est aussi regroupée dans [_plan développement licences / ACL §18.1](./_plan_developpement_licences_abonnements_acl_starium.md).
