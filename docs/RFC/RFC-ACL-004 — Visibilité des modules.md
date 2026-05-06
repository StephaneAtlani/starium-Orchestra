# RFC-ACL-004 — Visibilité des modules

## Statut

📝 Draft

## 1. Analyse de l’existant

L’activation module par client existe côté plateforme, mais il manque une couche de masquage fin côté client (client entier, groupe, utilisateur) sans désactiver globalement le module.

## 2. Hypothèses éventuelles

- Le module doit d’abord être activé côté plateforme pour être potentiellement visible.
- La priorité d’override est `USER > GROUP > CLIENT`.
- Le masquage module impacte UI et API (guard backend).

## 3. Liste des fichiers à créer / modifier

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/*_acl_004_module_visibility/migration.sql`
- `apps/api/src/modules/module-visibility/module-visibility.service.ts`
- `apps/api/src/modules/module-visibility/module-visibility.controller.ts`
- `apps/api/src/modules/module-visibility/guards/module-visibility.guard.ts`
- `apps/web/src/config/navigation.ts`
- `apps/web/src/features/module-visibility/*`

## 4. Implémentation complète

- Créer `ClientModuleVisibility`.
- Endpoints :
  - `GET /api/module-visibility`
  - `PATCH /api/module-visibility`
- Ajouter `ModuleVisibilityService` :
  - résolution effective par utilisateur ;
  - agrégation des groupes ;
  - fallback par défaut client.
- Ajouter `ModuleVisibilityGuard` dans pipeline client.
- Filtrer navigation frontend selon modules visibles.

## 5. Modifications Prisma si nécessaire

- Ajouter :
  - `ModuleVisibilityScopeType` (`CLIENT`, `GROUP`, `USER`)
  - `ModuleVisibilityState` (`VISIBLE`, `HIDDEN`)
  - modèle `ClientModuleVisibility`
- Index :
  - `@@index([clientId, moduleCode])`
  - `@@index([clientId, scopeType, scopeId])`

## 6. Tests

- module masqué utilisateur => accès refusé même si visible groupe/client.
- masqué groupe => refus si pas override utilisateur.
- masqué client => refus global sauf override explicite.
- module non activé plateforme => toujours refusé.
- navigation frontend masque les entrées non visibles.

## 7. Récapitulatif final

Cette RFC ajoute la couche de visibilité interne par client/groupe/utilisateur, complémentaire à l’activation plateforme et alignée avec le principe “accès réel = intersection des couches”.

## 8. Points de vigilance

- Respect strict de l’ordre de priorité des overrides.
- Ne pas dupliquer la logique de résolution dans le frontend ; backend source de vérité.
- Auditer toute modification de visibilité.
