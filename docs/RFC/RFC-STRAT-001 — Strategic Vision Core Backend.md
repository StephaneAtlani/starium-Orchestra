# RFC-STRAT-001 — Strategic Vision Core Backend

## 1) Contexte

Starium Orchestra doit offrir un module stratégique orienté pilotage décisionnel, non un espace d'inspiration libre.  
Le besoin est de relier explicitement la vision d'un client, ses axes stratégiques, ses objectifs et l'exécution opérationnelle déjà présente (projets, puis plus tard budgets et risques).

Le socle backend est la source de vérité pour :
- la structure stratégique ;
- les règles de cohérence métier ;
- l'isolation multi-client stricte ;
- la traçabilité via audit logs.

## 2) Problème adressé

Aujourd'hui, la stratégie est diffusée dans plusieurs vues opérationnelles sans modèle canonique unique.  
Conséquences :
- difficulté à relier une intention stratégique à des objets exécutables ;
- impossibilité de mesurer proprement l'alignement ;
- risque d'incohérences entre clients si le scope n'est pas centralisé côté backend.

## 3) Objectifs

- Fournir un modèle métier backend minimal et robuste pour Strategic Vision.
- Garantir le scoping `clientId` sur toutes les données du module.
- Permettre la gestion des visions, axes, objectifs, et liens vers exécution.
- Préparer les extensions futures BUDGET et RISK sans les activer dans le MVP.
- Exposer une API REST claire, protégée par les guards standards et les permissions dédiées.

## 4) Hors scope MVP

- Alignement natif avec budgets (calculs, vues, workflow).
- Couverture risques stratégique native.
- Multi-vision active par client.
- Moteur avancé de scoring stratégique composite.
- Automatisations complexes (workflows de validation, notifications multi-étapes).

## 5) Modèle de données cible

Le modèle cible est hiérarchique et orienté pilotage :
- `StrategicVision` : niveau intentionnel (cap stratégique client).
- `StrategicAxis` : structuration des priorités.
- `StrategicObjective` : objectifs opérationnalisables et mesurables.
- `StrategicLink` : pont vers objets métier existants, sans duplication.

### 5.1 Modèles Prisma proposés

#### `StrategicVision`
- `id`
- `clientId` (obligatoire)
- `title`
- `statement`
- `horizonLabel` (ex: 2026-2028)
- `isActive` (MVP: une seule active)
- `createdAt`, `updatedAt`

#### `StrategicAxis`
- `id`
- `clientId` (obligatoire)
- `visionId` (FK vers `StrategicVision`)
- `name`
- `description?`
- `orderIndex?`
- `createdAt`, `updatedAt`

#### `StrategicObjective`
- `id`
- `clientId` (obligatoire)
- `axisId` (FK vers `StrategicAxis`)
- `title`
- `description?`
- `ownerLabel?` (valeur métier affichable)
- `status` (`StrategicObjectiveStatus`)
- `deadline?`
- `createdAt`, `updatedAt`

#### `StrategicLink`
- `id`
- `clientId` (obligatoire)
- `objectiveId` (FK vers `StrategicObjective`)
- `linkType` (`StrategicLinkType`)
- `targetId` (ID externe de la ressource liée, ex: `Project.id`)
- `targetLabelSnapshot` (libellé métier lisible pour la restitution)
- `createdAt`

> `StrategicLink` référence des objets existants mais ne recopie pas leurs attributs métier (montants, statuts détaillés, etc.).

### 5.2 Enums proposés

#### `StrategicObjectiveStatus`
- `ON_TRACK`
- `AT_RISK`
- `OFF_TRACK`
- `COMPLETED`
- `ARCHIVED`

#### `StrategicLinkType`
- `PROJECT`
- `BUDGET` (préparé, non activé MVP)
- `RISK` (préparé, non activé MVP)

## 6) Règles multi-tenant

- `clientId` obligatoire sur `StrategicVision`, `StrategicAxis`, `StrategicObjective`, `StrategicLink`.
- Aucun `clientId` accepté dans les body DTO.
- Scope dérivé du client actif (contexte auth) et imposé côté backend.
- Toute lecture/écriture filtre strictement sur le `clientId` actif autorisé.
- Interdiction de créer un lien vers une entité d'un autre client.

## 7) Contraintes MVP

- Une seule vision active par client.
- Un axe appartient à une vision.
- Un objectif appartient à un axe.
- `StrategicLink` ne duplique aucune donnée métier source.
- MVP : `StrategicLinkType.PROJECT` uniquement en exécution.
- `BUDGET` et `RISK` présents dans les enums/contrats pour préparation V2, non activés fonctionnellement.

## 8) API cible

### Vision
- `GET /api/strategic-vision`
- `POST /api/strategic-vision`
- `PATCH /api/strategic-vision/:id`

### Axes
- `GET /api/strategic-axes`
- `POST /api/strategic-axes`
- `PATCH /api/strategic-axes/:id`

### Objectifs
- `GET /api/strategic-objectives`
- `POST /api/strategic-objectives`
- `PATCH /api/strategic-objectives/:id`

### Liens objectifs
- `POST /api/strategic-objectives/:id/links`
- `DELETE /api/strategic-objectives/:id/links/:linkId`

### Guards appliqués

Tous les endpoints sont protégés par :
- `JwtAuthGuard`
- `ActiveClientGuard`
- `ModuleAccessGuard`
- `PermissionsGuard`

## 9) Permissions proposées

- `strategic_vision.read`
- `strategic_vision.create`
- `strategic_vision.update`
- `strategic_vision.manage_links`

## 10) Audit logs obligatoires

- `strategic_vision.created`
- `strategic_vision.updated`
- `strategic_axis.created`
- `strategic_axis.updated`
- `strategic_objective.created`
- `strategic_objective.updated`
- `strategic_objective.status_changed`
- `strategic_objective.link_added`
- `strategic_objective.link_removed`

Chaque événement d'audit doit capturer a minima :
- `actorUserId`
- `clientId`
- `entityType`
- `entityId`
- `action`
- résumé old/new state si pertinent
- timestamp

## 11) Critères d'acceptation backend

- Le modèle Strategic Vision est défini et documenté avec isolation `clientId` stricte.
- Les routes listées existent dans le contrat d'API du module.
- Aucune route n'accepte un `clientId` entrant dans le body.
- Les guards standards sont appliqués sur toutes les routes du module.
- Les permissions dédiées couvrent lecture, écriture et gestion des liens.
- Les logs d'audit listés sont émis sur chaque mutation sensible.
- Le MVP accepte uniquement des liens `PROJECT`; `BUDGET` et `RISK` restent non activés.
- Aucune duplication de données métier sources dans `StrategicLink`.
