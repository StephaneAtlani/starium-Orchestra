# RFC-ACL-003 — Groupes d’accès client

## Statut

📝 Draft

## 1. Analyse de l’existant

Les permissions sont gérées au niveau rôle/utilisateur, mais il manque un objet métier de regroupement pour simplifier les ciblages d’accès fins (visibilité module, ACL ressource).

## 2. Hypothèses éventuelles

- Les groupes sont strictement client-scopés.
- Un même utilisateur peut appartenir à plusieurs groupes d’un même client.
- Le nom de groupe est unique par client.

## 3. Liste des fichiers à créer / modifier

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/*_acl_003_access_groups/migration.sql`
- `apps/api/src/modules/access-groups/access-groups.controller.ts`
- `apps/api/src/modules/access-groups/access-groups.service.ts`
- `apps/api/src/modules/access-groups/dto/*`
- `apps/api/src/modules/access-groups/tests/*`
- `apps/web/src/features/access-groups/*`

## 4. Implémentation complète

- Créer `AccessGroup` + `AccessGroupMember`.
- Endpoints :
  - `GET|POST /api/access-groups`
  - `GET|PATCH|DELETE /api/access-groups/:id`
  - `GET|POST /api/access-groups/:id/members`
  - `DELETE /api/access-groups/:id/members/:userId`
- Contrôles :
  - interdiction cross-client ;
  - unicité membre dans groupe ;
  - suppression groupe => suppression memberships (cascade).
- UI admin client :
  - listing groupes ;
  - détail membres ;
  - actions CRUD.

## 5. Modifications Prisma si nécessaire

- Ajouter modèles :
  - `AccessGroup` (`@@unique([clientId, name])`)
  - `AccessGroupMember` (`@@unique([groupId, userId])`)
- Index recommandés :
  - `AccessGroup.clientId`
  - `AccessGroupMember.[clientId, userId]`

## 6. Tests

- création groupe OK dans client actif.
- création doublon nom même client refusée.
- ajout membre hors client refusé.
- suppression groupe supprime les membres.
- isolation multi-client validée sur toutes routes.

## 7. Récapitulatif final

Cette RFC introduit la brique de regroupement métier nécessaire pour industrialiser visibilité modules et ACL sans multiplier les règles utilisateur par utilisateur.

## 8. Points de vigilance

- Toujours résoudre `clientId` depuis le contexte actif.
- Auditer `group.created/updated/deleted` et `member_added/removed`.
- Garder les réponses API lisibles (nom utilisateur, email) sans afficher d’ID brut seul en UI.
