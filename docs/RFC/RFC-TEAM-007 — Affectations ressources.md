# RFC-TEAM-007 — Affectations ressources (staffing planifié)

## Statut

Implémentée (backend MVP) — module NestJS `team-assignments`, migration Prisma `20260405120000_add_team_resource_assignments_team007`, permissions `team_assignments.read` / `team_assignments.manage`, seed module + rôle global équipes + `default-profiles.json`, tests unitaires.

## Implémentation livrée (référence code)

- **Prisma** : [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) — `TeamResourceAssignment` ; migration dédiée.
- **API** : préfixe `/api` — `TeamAssignmentsController` (`/team-resource-assignments`). Permissions : `team_assignments.read`, `team_assignments.manage` ; guards JWT + client actif + module + permissions.
- **Liste paginée** : `{ items, total, limit, offset }` ; tri `startDate` desc, `id` desc.
- **Seed** : `ensureTeamAssignmentsModuleAndPermissions`, extension `ensureClientAdminTeamsModuleRole` ; profils Lecteur / Gestionnaire Équipes.
- **Tests** : `team-assignments.controller.spec.ts`, `team-assignments.service.spec.ts`, `tests/team-assignments-seed-permissions.spec.ts`.

## Priorité

Très haute — **Phase 3** du plan Équipes ; **cœur du staffing**. Prérequis naturel pour RFC-TEAM-008 (staffing projet / vue projet), RFC-FE-TEAM-005 (UI affectations), RFC-TEAM-009 (préremplissage timesheet) et agrégations charge (RFC-TEAM-011), décrits dans [`_Plan de déploiement - Equipe.md`](./_Plan%20de%20d%C3%A9ploiement%20-%20Equipe.md).

## Dépendances

- [RFC-TEAM-002](./RFC-TEAM-002%20%E2%80%94%20R%C3%A9f%C3%A9rentiel%20Collaborateurs%20m%C3%A9tier.md) — entité `Collaborator`, statuts, isolation `clientId`
- [RFC-TEAM-006](./RFC-TEAM-006%20%E2%80%94%20Taxonomie%20des%20activit%C3%A9s.md) — `ActivityType` / `ActivityTaxonomyKind` (classification de la charge planifiée)
- Module **Projets** — `Project` (`ProjectKind` PROJECT \| ACTIVITY), scoping client ; pas d’obligation qu’une charge « métier » passe par un projet (voir §1)
- [RFC-TEAM-005](./RFC-TEAM-005%20%E2%80%94%20R%C3%A9f%C3%A9rentiel%20%C3%89quipes%20p%C3%A9rim%C3%A8tres%20managers.md) — périmètres managers pour filtres et droits d’accès en lecture (§4.6)
- `docs/ARCHITECTURE.md` — multi-client, client actif, API-first
- RFC-013 — audit des mutations
- `.cursorrules` — **inputs UI : libellés métier**, jamais d’UUID seul pour les sélections ou tableaux

## Consommateurs prévus

- RFC-TEAM-008 — staffing depuis la fiche projet
- RFC-FE-TEAM-005 — écrans affectations (depuis équipe / depuis projet)
- RFC-TEAM-009 — suggestion de lignes de temps à partir des affectations actives
- RFC-TEAM-011 / 012 — agrégation charge planifiée vs capacité / réel
- Cœur financier — `FinancialSourceType.TEAM_ASSIGNMENT` + `sourceId` : liaison future des allocations / événements financiers vers cette entité (hors périmètre MVP fonctionnel de cette RFC, mais **ID stable** prévu)

---

# 1. Analyse de l’existant

## 1.1 Constats

| Concept / modèle | Rôle actuel | Limite pour le staffing planifié |
| --- | --- | --- |
| **`Collaborator`** | Référentiel personne métier (équipes) | C’est la **bonne** ancre pour « qui » est affecté (pas `User` seul, sauf lien explicite métier). |
| **`Project`** + `ProjectKind` | Projet structuré ou activité de suivi côté SI | Cible naturelle quand la charge est **rattachée à une ligne projet / activité projet**. |
| **`ProjectTeamMember`** | Effectif projet (rôle dans l’équipe projet, user ou libellé libre) | **Roster** : qui participe au projet ; **pas** de période ni de taux de charge planifié. Complémentaire, non remplaçable par une affectation staffing. |
| **`ProjectTask.responsibleResource`** | `Resource` (référentiel transverse) | Pilotage tâche, pas la même granularité qu’une **ligne de staffing** collaborateur. |
| **`ActivityType` (TEAM-006)** | Taxonomie PROJECT / RUN / SUPPORT / TRANSVERSE / OTHER | Nécessaire pour classifier la charge **hors** ou **en plus** du projet, et pour le reporting transverse. |
| **`Collaborator.assignments` (Json)** | Champ libre historique / placeholder | **Ne pas** considérer comme source de vérité ; la vérité staffing = **table relationnelle** introduite ici. |

## 1.2 Besoin produit

Modéliser une **affectation planifiée** :

- **Un collaborateur** (`collaboratorId`)
- **Sur une cible** : soit un **`Project`** (projet ou activité projet), soit une **charge sans projet** (RUN / SUPPORT / TRANSVERSE / OTHER) identifiée par **`ActivityType`** uniquement
- **Avec une période** : date de début, date de fin (optionnelle = ouvert)
- **Un rôle métier** (libellé ou référentiel — voir §4)
- **Un taux de charge** : pourcentage de temps ou équivalent FTE (arbitrage §2)

Cette entité est la **source de la charge planifiée** pour les modules aval (capacité, conflits, timesheet).

## 1.3 Objectif de la RFC

Définir le **modèle Prisma**, les **règles d’intégrité**, les **API REST**, le **RBAC**, l’**audit** et les **tests** pour les **affectations ressources** (`TeamResourceAssignment` — nom de travail ; voir §4.1), en respectant strictement l’**isolation client** et en préparant les **réponses enrichies** (noms projet, type d’activité, collaborateur) pour l’UI.

---

# 2. Hypothèses éventuelles

1. **Cible projet vs charge hors projet** — exactement **une** des deux doit être vraie au sens métier :
   - **Affectation « projet »** : `projectId` renseigné, `activityTypeId` **obligatoire** (cohérence avec TEAM-006 : même une charge projet est classée dans la taxonomie ; défaut possible via `ActivityType` du `kind` PROJECT côté client).
   - **Affectation « hors projet »** : `projectId` null, `activityTypeId` **obligatoire** avec `kind` ≠ `PROJECT` (validation applicative : `RUN`, `SUPPORT`, `TRANSVERSE` ou `OTHER`).

   *Variante acceptable MVP* : autoriser `projectId` + `activityTypeId` avec `kind` PROJECT uniquement pour simplifier les requêtes reporting ; interdire combinaisons incohérentes (ex. `projectId` set + `activityType.kind` = RUN).

2. **Unicité et chevauchements** — Les **chevauchements temporels** sur le **même** `(clientId, collaboratorId, projectId, activityTypeId)` peuvent être **autorisés** (plusieurs lignes complémentaires ou correction) ou **signalés** en warning selon politique produit. **Recommandation MVP** : autoriser les chevauchements ; exposer plus tard un endpoint ou indicateur « charge cumulée » (TEAM-011) sans bloquer la saisie.

3. **Taux de charge** — Stockage en **`allocationPercent`** (Decimal 5,2 ou `Float` contrôlé), **0 < valeur ≤ 100** (ou 0–100 avec sémantique « à l’arrêt » si besoin). Alternative : `fte` ∈ ]0,1] ; **choix unique** dans l’implémentation pour éviter la double comptabilité.

4. **Rôle** — MVP : **`roleLabel`** `String` (1–120 car.) obligatoire, saisie libre ou sélection depuis un référentiel futur. **Option** : FK optionnelle vers `ProjectTeamRole` **uniquement si** `projectId` est défini, pour aligner wording fiche projet / staffing (sans rendre `ProjectTeamMember` obligatoire).

5. **Soft delete** — Préférer **suppression logique** (`cancelledAt` ou `archivedAt`) pour conserver l’historique de planification ; suppression physique réservée aux admins ou scripts.

6. **Permissions** — Module fonctionnel distinct (ex. `team-assignments`) avec lecture large pour rôles pilotage et écriture pour rôles staffing / managers de périmètre (affiner avec TEAM-005).

---

# 3. Fichiers livrés (alignement dépôt)

Les chemins ci-dessous correspondent à l’implémentation MVP. Les sections §4–7 restent la **spécification de conception** ; en cas d’écart mineur (ex. `onDelete: Restrict` sur `projectId`, corps d’erreur JSON `{ error, message }`), la **vérité opérationnelle** est le code sous [`apps/api/src/modules/team-assignments/`](../../apps/api/src/modules/team-assignments/) et les tests associés.

## Prisma

- [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) — modèle `TeamResourceAssignment`, relations `Collaborator`, `Project`, `ActivityType`, `ProjectTeamRole`, indexes
- Migration `20260405120000_add_team_resource_assignments_team007`

## Backend NestJS — module `team-assignments`

- [`team-assignments.module.ts`](../../apps/api/src/modules/team-assignments/team-assignments.module.ts)
- [`team-assignments.controller.ts`](../../apps/api/src/modules/team-assignments/team-assignments.controller.ts)
- [`team-assignments.service.ts`](../../apps/api/src/modules/team-assignments/team-assignments.service.ts)
- [`dto/create-team-resource-assignment.dto.ts`](../../apps/api/src/modules/team-assignments/dto/create-team-resource-assignment.dto.ts)
- [`dto/update-team-resource-assignment.dto.ts`](../../apps/api/src/modules/team-assignments/dto/update-team-resource-assignment.dto.ts)
- [`dto/list-team-resource-assignments.query.dto.ts`](../../apps/api/src/modules/team-assignments/dto/list-team-resource-assignments.query.dto.ts)
- [`team-assignments.service.spec.ts`](../../apps/api/src/modules/team-assignments/team-assignments.service.spec.ts)
- [`team-assignments.controller.spec.ts`](../../apps/api/src/modules/team-assignments/team-assignments.controller.spec.ts)
- [`tests/team-assignments-seed-permissions.spec.ts`](../../apps/api/src/modules/team-assignments/tests/team-assignments-seed-permissions.spec.ts)

## Intégration

- [`app.module.ts`](../../apps/api/src/app.module.ts) — import `TeamAssignmentsModule`
- [`prisma/seed.ts`](../../apps/api/prisma/seed.ts) — `ensureTeamAssignmentsModuleAndPermissions`, extension `ensureClientAdminTeamsModuleRole`
- [`default-profiles.json`](../../apps/api/prisma/default-profiles.json) — profils Lecteur / Gestionnaire Équipes

## Documentation

- Ce document (statut et §3 synchronisés)
- [`docs/API.md`](../API.md) — section « Équipes — affectations ressources »
- [`docs/RFC/_Plan de déploiement - Equipe.md`](./_Plan%20de%20d%C3%A9ploiement%20-%20Equipe.md), [`docs/RFC/_RFC Liste.md`](./_RFC%20Liste.md), [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — index et arborescence backend

---

# 4. Implémentation complète

## 4.1 Modèle de données (proposition)

**Nom Prisma** : `TeamResourceAssignment` (préfixe « Team » pour cohérence module Équipes ; éviter `Assignment` seul trop générique).

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `id` | `String` @id cuid | oui | Identifiant technique |
| `clientId` | `String` | oui | Isolation multi-tenant |
| `collaboratorId` | `String` | oui | Collaborateur affecté |
| `projectId` | `String?` | non | Projet / activité projet ciblé ; `null` = charge hors projet |
| `activityTypeId` | `String` | oui | Classification taxonomie (TEAM-006) |
| `projectTeamRoleId` | `String?` | non | Optionnel : alignement avec un rôle d’équipe projet |
| `roleLabel` | `String` | oui | Libellé affiché du rôle (saisie ou copie depuis référentiel) |
| `startDate` | `DateTime` | oui | Début d’affectation (date ; normaliser en UTC date-only si convention repo) |
| `endDate` | `DateTime?` | non | Fin incluse ou exclusive — **à figer une convention** (recommandation : **fin inclusive** date calendaire, ou `endDate` exclusive type `[start, end)` pour éviter ambiguïté fuseaux) |
| `allocationPercent` | `Decimal` | oui | Taux de charge % (ex. 50 = 50 %) |
| `notes` | `String?` | non | Commentaire interne |
| `cancelledAt` | `DateTime?` | non | Annulation logique |
| `createdAt` / `updatedAt` | `DateTime` | oui | Audit technique |
| `createdByUserId` / `updatedByUserId` | `String?` | non | Si pattern disponible dans le repo |

**Relations**

- `client` → `Client`
- `collaborator` → `Collaborator` (`onDelete: Restrict` — ne pas supprimer un collaborateur avec affectations actives sans politique explicite)
- `project` → `Project?` (`onDelete: SetNull` ou `Restrict` selon produit ; si projet supprimé, préférer **Restrict** avec archivage projet)
- `activityType` → `ActivityType` (`onDelete: Restrict`)
- `projectTeamRole` → `ProjectTeamRole?` (`onDelete: SetNull`)

**Indexes**

- `@@index([clientId, collaboratorId])`
- `@@index([clientId, projectId])`
- `@@index([clientId, startDate, endDate])` — fenêtres temporelles
- `@@index([clientId, activityTypeId])`

**Contraintes métier (validation service)**

- `collaborator.clientId === client.clientId === project?.clientId === activityType.clientId`
- Si `projectId` non null : vérifier que `Project` existe et appartient au client
- Si `projectTeamRoleId` renseigné : même `clientId` et `projectId` cohérent avec le rôle (le rôle projet est scopé client ; vérifier que le rôle est utilisé pour **ce** projet si le modèle `ProjectTeamRole` est global au client — **à valider** avec le schéma actuel : `ProjectTeamRole` est par client, pas par projet ; l’usage est comme catalogue de rôles pour `ProjectTeamMember` ; la cohérence **projet** se fait via `ProjectTeamMember` ou par convention libre)
- `allocationPercent` dans une plage validée (ex. `]0, 100]` ou `[0, 100]` si 0 autorisé pour « réservé mais pas démarré »)
- `endDate` ≥ `startDate` si les deux présents (ou convention demi-ouvert)

## 4.2 Règles métier

1. **Création** — Tous les DTO validés ; résolution du client depuis le contexte auth **uniquement** (pas de `clientId` client fourni en body).
2. **Lecture** — Listes avec filtres : `collaboratorId`, `projectId`, `activityTypeId`, plage `[from, to]` intersectant la période, `includeCancelled`.
3. **Mise à jour** — PATCH partiel ; interdire de déplacer vers un autre `clientId`.
4. **Annulation** — `cancelledAt = now()` plutôt que DELETE pour traçabilité.
5. **Cohérence ActivityType / Project** — Règles §2 hypothèse 1 appliquées dans le service (erreur 400 explicite).

## 4.3 API REST (proposition)

Préfixe `/api` ; toutes les routes : JWT + client actif + module activé + permissions.

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/team-resource-assignments` | Liste paginée `{ items, total, limit, offset }` + filtres query |
| `GET` | `/team-resource-assignments/:id` | Détail |
| `POST` | `/team-resource-assignments` | Création |
| `PATCH` | `/team-resource-assignments/:id` | Mise à jour |
| `POST` | `/team-resource-assignments/:id/cancel` | Annulation logique (idempotent) |

**Query `GET` (exemples)**

- `collaboratorId`, `projectId`, `activityTypeId`
- `activeOn=2026-04-15` — affectations non annulées couvrant cette date
- `from=2026-01-01&to=2026-12-31` — intersection avec période

**Forme des items (liste / détail)**

Chaque réponse inclut au minimum :

- Identifiants : `id`, `collaboratorId`, `projectId`, `activityTypeId`
- **Affichage** : `collaboratorDisplayName`, `projectName` + `projectCode` (si projet), `activityTypeName` + `activityTypeKind`, `roleLabel`
- Champs techniques : période, `allocationPercent`, `cancelledAt`, `notes`

**DTO**

- `CreateTeamResourceAssignmentDto` — `collaboratorId`, `projectId?`, `activityTypeId`, `projectTeamRoleId?`, `roleLabel`, `startDate`, `endDate?`, `allocationPercent`, `notes?` — `class-validator`
- `UpdateTeamResourceAssignmentDto` — partiel
- `ListTeamResourceAssignmentsQueryDto` — pagination + filtres ci-dessus

## 4.4 RBAC

- `team_assignments.read` — lecture listes / détail (collaborateur, chef de projet, manager selon affinage)
- `team_assignments.manage` — création, modification, annulation

**Règles de périmètre manager (alignement TEAM-005)** — Pour un utilisateur **non** admin client global : restreindre la lecture / l’écriture aux collaborateurs **dans le périmètre** du manager connecté (même logique que `ManagerScopesService` / APIs collaborateurs). **Ne pas** dupliquer la logique de calcul côté UI ; centraliser dans le service ou un guard dédié.

## 4.5 Audit (RFC-013)

Journaliser : création, modification, annulation, avec `clientId`, `assignmentId`, `collaboratorId`, résumé des champs (anciennes / nouvelles valeurs pour période et taux).

## 4.6 Distinction avec RFC-TEAM-008 (plan Équipes)

- **TEAM-007** : **modèle et API** génériques des affectations (réutilisables depuis l’équipe, le collaborateur, ou le projet).
- **TEAM-008** : **usage** côté projet (filtres, regroupements, UX responsable projet) — **consomme** les mêmes endpoints ou services, pas un second modèle.

---

# 5. Modifications Prisma (récapitulatif)

- Ajout modèle `TeamResourceAssignment` avec relations vers `Client`, `Collaborator`, `Project?`, `ActivityType`, `ProjectTeamRole?`
- Pas de modification du JSON `Collaborator.assignments` obligatoire ; migration de données optionnelle hors scope

---

# 6. Tests

- **Service** : isolation client ; validation `ActivityType` / `Project` ; règles date ; annulation idempotente ; filtre `activeOn`
- **Contrôleur** : JWT + client actif + permissions ; 404 hors scope ; validation DTO
- **Cas périmètre manager** : utilisateur avec scope restreint ne voit pas les affectations hors périmètre (si implémenté dans la même livraison)

---

# 7. Récapitulatif final

**RFC-TEAM-007** introduit l’entité **affectation planifiée** d’un **collaborateur** vers un **projet optionnel** et un **type d’activité** obligatoire, avec **période**, **rôle** et **taux de charge**, en s’appuyant sur **TEAM-006** et le module **Projets**, sans confondre avec **`ProjectTeamMember`** (effectif sans temporalité). Elle prépare **timesheet**, **capacité/charge** et les **vues manager**, avec **API enrichie** pour respecter la règle **valeur affichée, pas ID** en UI.

---

# 8. Points de vigilance

- **Convention de date de fin** — Documenter clairement inclusif vs exclusif ; impact direct sur intersection « journée / semaine » et TEAM-009.
- **Chevauchements** — La somme des `allocationPercent` sur une même période peut dépasser 100 % ; TEAM-011 doit agréger sans supposer que la base interdit les conflits.
- **`ProjectTeamRole`** — Le modèle actuel est un **catalogue** par client ; l’optionalité de `projectTeamRoleId` sert surtout au **libellé** cohérent. Ne pas inférer automatiquement une ligne `ProjectTeamMember`.
- **Financial core** — `FinancialSourceType.TEAM_ASSIGNMENT` existe déjà : toute allocation financière future devra référencer `TeamResourceAssignment.id` comme `sourceId` de façon cohérente (hors MVP cette RFC).
- **Inputs UI** — Selects : collaborateur par `displayName`, projet par `name` + `code`, type d’activité par `name` + badge `kind` ; **jamais** UUID seul.
- **Nommage utilisateur** — Éviter « ressource » seul en UI si ambigu avec `Resource` (référentiel technique) ; privilégier **« affectation »** ou **« staffing »** / **« charge planifiée »**.

---

# 9. Références croisées

- Plan Équipes : [`docs/RFC/_Plan de déploiement - Equipe.md`](./_Plan%20de%20d%C3%A9ploiement%20-%20Equipe.md)
- Taxonomie : [RFC-TEAM-006](./RFC-TEAM-006%20%E2%80%94%20Taxonomie%20des%20activit%C3%A9s.md)
- UI affectations : RFC-FE-TEAM-005 (plan Équipes, Phase 3)
