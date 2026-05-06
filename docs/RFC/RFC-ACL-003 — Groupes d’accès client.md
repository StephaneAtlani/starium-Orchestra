# RFC-ACL-003 — Groupes d’accès client

## Statut

✅ Implémentée (MVP)

## 1. Analyse de l’existant

Les permissions sont gérées au niveau rôle/utilisateur, mais il manque un objet métier de regroupement pour simplifier les ciblages d’accès fins (visibilité module, ACL ressource).

## 2. Hypothèses éventuelles

- Les groupes sont strictement client-scopés.
- Un même utilisateur peut appartenir à plusieurs groupes d’un même client.
- Le nom de groupe est unique par client.

## 3. Fichiers créés / modifiés

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260507120000_acl_003_access_groups/migration.sql`
- `apps/api/src/modules/access-groups/access-groups.module.ts`
- `apps/api/src/modules/access-groups/access-groups.controller.ts`
- `apps/api/src/modules/access-groups/access-groups.service.ts`
- `apps/api/src/modules/access-groups/dto/*`
- `apps/api/src/modules/access-groups/access-groups.service.spec.ts`
- `apps/api/src/app.module.ts`
- `apps/web/src/features/access-groups/*`
- `apps/web/src/app/(protected)/client/access-groups/*`
- `apps/web/src/app/(protected)/client/administration/page.tsx`

## 4. Implémentation livrée

- Modèles Prisma `AccessGroup` + `AccessGroupMember` livrés.
- Endpoints livrés :
  - `GET|POST /api/access-groups`
  - `GET|PATCH|DELETE /api/access-groups/:id`
  - `GET|POST /api/access-groups/:id/members`
  - `DELETE /api/access-groups/:id/members/:userId`
- Contrôles livrés :
  - scoping strict sur `clientId` actif (`JwtAuthGuard` + `ActiveClientGuard` + `ClientAdminGuard`) ;
  - unicité nom de groupe par client (`@@unique([clientId, name])`) ;
  - unicité membre dans groupe (`@@unique([groupId, userId])`) ;
  - vérification `ClientUser` **ACTIVE** sur le même `clientId` avant ajout ;
  - suppression groupe en cascade DB sur memberships.
- Audit livré :
  - `access_group.created`
  - `access_group.updated`
  - `access_group.deleted` (avec `oldValue.name` journalisé avant suppression)
  - `access_group.member_added`
  - `access_group.member_removed`
- UI admin client livrée :
  - listing groupes (`/client/access-groups`) ;
  - détail groupe + membres (`/client/access-groups/[id]`) ;
  - création/renommage/suppression de groupe ;
  - ajout/retrait de membre avec options lisibles.

## 5. Modifications Prisma

- Modèles ajoutés :
  - `AccessGroup` (`@@unique([clientId, name])`, `@@index([clientId])`)
  - `AccessGroupMember` (`@@unique([groupId, userId])`, `@@index([clientId, userId])`)
- Relations ajoutées :
  - `Client.accessGroups`
  - `Client.accessGroupMembers`
  - `User.accessGroupMembers`

## 6. Tests livrés

- `apps/api/src/modules/access-groups/access-groups.service.spec.ts`
- couverture effective :
  - création groupe OK dans client actif ;
  - doublon de nom (`P2002`) mappé en `ConflictException` ;
  - ajout membre refusé sans `ClientUser` ACTIVE dans le client ;
  - audit avant suppression de groupe ;
  - filtres `clientId` / `groupId` appliqués sur lectures membres.

## 7. Récapitulatif

La brique de regroupement métier est opérationnelle côté backend et UI admin client, avec scoping multi-client strict, audit et contraintes d’intégrité pour préparer les RFC ACL suivantes (visibilité modules et ACL ressources) sans brancher encore ces groupes sur les permissions métier.

## 8. Points de vigilance

- Toujours résoudre `clientId` depuis le contexte actif.
- Auditer `access_group.created/updated/deleted` et `access_group.member_added/removed`.
- Garder les réponses API lisibles (nom utilisateur, email) sans afficher d’ID brut seul en UI.
- Le dialogue d’ajout membre filtre les utilisateurs déjà présents dans le groupe.
- Hors scope confirmé : pas de branchement de ces groupes sur les permissions métier dans ce lot.
