# RFC-STRAT-007 — Vision stratégique V1 — Core backend et modèle de données

## Statut

✅ Implémentée (backend V1 additive)

## 1. Analyse de l’existant

Le module `strategic-vision` existe déjà avec une base `Vision → Axes → Objectifs → Liens`, un scoping `clientId`, et des routes backend/guards standardisés.

Le plan `docs/RFC/_Plan de developpement - Strategie.md` précise cependant un cadrage V1 plus strict sur :

- les statuts métier (`DRAFT`, `ACTIVE`, `ARCHIVED`, etc.) ;
- les validations métier (`progressPercent` borné, archivage logique) ;
- la cohérence des liens stratégiques cross-modules ;
- la complétude des DTO et des endpoints imbriqués.

## 2. Hypothèses éventuelles

- Le module reste sous le préfixe `/api/strategic-vision`.
- Le client actif est toujours dérivé de l’authentification (`X-Client-Id` + guards), jamais injecté depuis les DTO.
- Toute suppression en V1 est logique (archivage), sauf cas explicitement défini par une autre RFC.

## 3. Fichiers à créer / modifier

Backend :

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260507100000_strategic_vision_v1_enums/migration.sql`
- `apps/api/prisma/migrations/20260507100100_strategic_vision_v1_fields_backfill/migration.sql`
- `apps/api/src/modules/strategic-vision/strategic-vision.module.ts`
- `apps/api/src/modules/strategic-vision/strategic-vision.controller.ts`
- `apps/api/src/modules/strategic-vision/strategic-vision.service.ts`
- `apps/api/src/modules/strategic-vision/dto/create-strategic-vision.dto.ts`
- `apps/api/src/modules/strategic-vision/dto/update-strategic-vision.dto.ts`
- `apps/api/src/modules/strategic-vision/dto/create-strategic-axis.dto.ts`
- `apps/api/src/modules/strategic-vision/dto/update-strategic-axis.dto.ts`
- `apps/api/src/modules/strategic-vision/dto/create-strategic-objective.dto.ts`
- `apps/api/src/modules/strategic-vision/dto/update-strategic-objective.dto.ts`
- `apps/api/src/modules/strategic-vision/dto/create-strategic-link.dto.ts`
- `apps/api/src/modules/strategic-vision/dto/update-strategic-link.dto.ts`
- `apps/api/src/modules/strategic-vision/dto/list-strategic-vision-query.dto.ts`

## 4. Implémentation complète

### 4.1 Modèle métier cible

- `StrategicVision` : vision globale du client actif.
- `StrategicAxis` : priorités structurantes rattachées à une vision.
- `StrategicObjective` : résultats attendus rattachés à un axe.
- `StrategicLink` : alignement objectif ↔ objet métier (projet, budget, risque, etc.) sans mutation de l’objet cible.

### 4.2 Règles métier à imposer

- Interdire toute écriture hors `clientId` actif.
- Interdire création d’axe sur vision `ARCHIVED`.
- Interdire modification d’une vision `ARCHIVED`.
- `progressPercent` entre `0` et `100`.
- `alignmentScore` entre `0` et `100` quand renseigné.
- Unicité logique des liens : `(objectiveId, linkType, targetId)`.
- `DELETE` = archivage logique (`status = ARCHIVED`) pour vision/axe/objectif.
- Types de liens autorisés en écriture V1 : `PROJECT`, `MANUAL` (avec `targetId` généré côté backend si absent pour `MANUAL`).
- Types présents pour compatibilité future mais refusés en write V1 : `BUDGET`, `BUDGET_LINE`, `RISK`, `GOVERNANCE_CYCLE` (`BadRequestException("Target type not supported in MVP")`).

### 4.3 Contrat API V1

Vision :

- `GET /api/strategic-vision`
- `POST /api/strategic-vision`
- `GET /api/strategic-vision/:id`
- `PATCH /api/strategic-vision/:id`
- `DELETE /api/strategic-vision/:id`

Axes :

- `GET /api/strategic-vision/:visionId/axes`
- `POST /api/strategic-vision/:visionId/axes`
- `GET /api/strategic-vision/:visionId/axes/:axisId`
- `PATCH /api/strategic-vision/:visionId/axes/:axisId`
- `DELETE /api/strategic-vision/:visionId/axes/:axisId`

Objectifs :

- `GET /api/strategic-vision/axes/:axisId/objectives`
- `POST /api/strategic-vision/axes/:axisId/objectives`
- `GET /api/strategic-vision/objectives/:objectiveId`
- `PATCH /api/strategic-vision/objectives/:objectiveId`
- `DELETE /api/strategic-vision/objectives/:objectiveId`

Liens :

- `GET /api/strategic-vision/objectives/:objectiveId/links`
- `POST /api/strategic-vision/objectives/:objectiveId/links`
- `PATCH /api/strategic-vision/objectives/:objectiveId/links/:linkId`
- `DELETE /api/strategic-vision/objectives/:objectiveId/links/:linkId`

### 4.4 Sécurité / RBAC

Guards obligatoires sur toutes les routes :

- `JwtAuthGuard`
- `ActiveClientGuard`
- `ModuleAccessGuard`
- `PermissionsGuard`

Permissions minimales :

- `strategic_vision.read`
- `strategic_vision.create`
- `strategic_vision.update`
- `strategic_vision.delete`
- `strategic_vision.manage_links`

## 5. Modifications Prisma si nécessaire

### 5.1 Enums recommandées

- `StrategicVisionStatus`: `DRAFT | ACTIVE | ARCHIVED`
- `StrategicAxisStatus`: `ACTIVE | INACTIVE | ARCHIVED`
- `StrategicObjectiveStatus`: `DRAFT | ACTIVE | COMPLETED | ARCHIVED`
- `StrategicObjectiveHealthStatus`: `ON_TRACK | AT_RISK | OFF_TRACK`
- `StrategicLinkType`: `PROJECT | BUDGET | RISK | BUDGET_LINE | GOVERNANCE_CYCLE | MANUAL` (`targetType` = alias applicatif DTO/API de `linkType`)

### 5.2 Contraintes et index

- Index par `clientId` sur chaque table stratégique.
- Contrainte unique lien stratégique : `@@unique([objectiveId, linkType, targetId])`.
- Index de filtrage `status`, `targetDate`, `visionId`, `axisId` selon volumétrie.

## 6. Tests

Backend :

- création vision avec client actif ;
- refus création sans client actif ;
- refus lecture/écriture sans permission ;
- refus cross-client sur tous les reads/writes ;
- archivage logique sans suppression physique ;
- bornes `progressPercent`/`alignmentScore` ;
- rejet doublon de lien stratégique.

## 7. Récapitulatif final

Cette RFC verrouille le socle V1 backend du module Vision stratégique : modèle stable, API REST complète, archivage logique, règles métier strictes, RBAC et isolation multi-client systématiques.

## 8. Points de vigilance

- Ne jamais accepter `clientId` en DTO d’entrée.
- Ne jamais modifier un objet cible via `StrategicLink`.
- Garantir l’affichage métier côté UI (valeur lisible, jamais ID brut) dans les réponses API (champs `name`, `title`, `code`, `label` quand nécessaire).
