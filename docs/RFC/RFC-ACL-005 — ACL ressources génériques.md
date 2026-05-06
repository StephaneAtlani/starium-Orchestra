# RFC-ACL-005 — ACL ressources génériques

## Statut

📝 Draft

## 1. Analyse de l’existant

Le RBAC contrôle l’accès fonctionnel global, mais ne permet pas d’exprimer un droit fin par ressource spécifique (ex: projet sensible visible uniquement par certains sujets).

## 2. Hypothèses éventuelles

- Les sujets ACL supportés en V1 sont `USER` et `GROUP`.
- La règle de compatibilité ascendante est impérative : absence d’ACL => comportement actuel conservé.
- Une ACL explicite bascule en mode restrictif.

## 3. Liste des fichiers à créer / modifier

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/*_acl_005_resource_acl/migration.sql`
- `apps/api/src/modules/access-control/access-control.service.ts`
- `apps/api/src/modules/access-control/resource-acl.controller.ts`
- `apps/api/src/modules/access-control/guards/resource-acl.guard.ts`
- `apps/api/src/modules/access-control/dto/*`
- `apps/api/src/modules/access-control/tests/*`

## 4. Implémentation complète

- Créer modèle `ResourceAcl`.
- Endpoints :
  - `GET /api/resource-acl/:resourceType/:resourceId`
  - `PUT /api/resource-acl/:resourceType/:resourceId`
  - `POST /api/resource-acl/:resourceType/:resourceId/entries`
  - `DELETE /api/resource-acl/:resourceType/:resourceId/entries/:entryId`
- Créer `AccessControlService` :
  - `canReadResource`, `canWriteResource`, `canAdminResource`
  - résolution utilisateur + groupes
  - fallback “pas d’ACL => autoriser selon RBAC existant”.
- Ajouter `ResourceAclGuard` sur endpoints ressources ciblées.

## 5. Modifications Prisma si nécessaire

- Ajouter enums :
  - `ResourceAclSubjectType` (`USER`, `GROUP`)
  - `ResourceAclPermission` (`READ`, `WRITE`, `ADMIN`)
- Ajouter modèle `ResourceAcl` + contrainte unique composite pour éviter les doublons.

## 6. Tests

- absence d’ACL conserve comportement existant.
- ACL utilisateur READ autorise lecture, refuse écriture.
- ACL groupe WRITE autorise écriture.
- utilisateur hors ACL refusé.
- cross-client refusé sur gestion des ACL.

## 7. Récapitulatif final

Cette RFC introduit un moteur ACL transversal et réutilisable qui complète RBAC, sans régression fonctionnelle sur les ressources non restreintes.

## 8. Points de vigilance

- Toujours valider l’appartenance client des sujets ACL.
- Garder un contrat API générique (`resourceType`, `resourceId`) pour réutilisation multi-modules.
- Auditer toute mutation ACL (bulk et entrée unitaire).
