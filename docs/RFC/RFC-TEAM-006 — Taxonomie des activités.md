# RFC-TEAM-006 — Taxonomie des activités

## Statut

Implémentée (backend MVP) — module NestJS `activity-types`, migration Prisma `20260404120000_add_activity_types_team006`, seed module `activity_types` + permissions `activity_types.read` / `activity_types.manage`, fonction `ensureDefaultActivityTypes` partagée, bootstrap `ClientsService.create`, tests unitaires.

## Implémentation livrée (référence code)

- **Prisma** : [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) — `ActivityTaxonomyKind`, `ActivityType` ; migration dédiée.
- **API** : préfixe `/api` — `ActivityTypesController` (`/activity-types`). Permissions : `activity_types.read`, `activity_types.manage` ; guards JWT + client actif + module + permissions.
- **Liste paginée** : `{ items, total, limit, offset }` ; tri fixe `sortOrder` puis `name` ; archive/restauration `PATCH …/archive` et `PATCH …/restore` (idempotents si déjà dans l’état cible).
- **Seed** : `ensureActivityTypesModuleAndPermissions`, extension rôle global « Client admin — équipes métier », `default-profiles.json` (Lecteur / Gestionnaire Équipes), passe `ensureDefaultActivityTypesForAllClients`.
- **Tests** : `activity-types.controller.spec.ts`, `activity-types.service.spec.ts`, `activity-types-defaults.spec.ts`, `activity-types-seed-permissions.spec.ts`.

## Priorité

Haute — Phase 3 du plan Équipes ; **prérequis** pour RFC-TEAM-007 (affectations ressources), RFC-TEAM-009 (saisie des temps) et toute agrégation charge / capacité par nature d’activité.

## Dépendances

- [RFC-TEAM-002](./RFC-TEAM-002%20%E2%80%94%20R%C3%A9f%C3%A9rentiel%20Collaborateurs%20m%C3%A9tier.md) — aucune relation directe obligatoire au MVP, mais les écrans staffing réutilisent le contexte collaborateurs
- `docs/ARCHITECTURE.md` — multi-client, `X-Client-Id`, API-first, isolation
- `.cursorrules` — réponses API avec libellés métier ; jamais d’ID seul en UI pour les sélections
- RFC-013 — Audit logs sur mutations du référentiel
- Cohérence transverse (lecture seule dans cette RFC) : module **Projets** (`Project`, `ProjectKind`), **Budget** (`BudgetEnvelopeType`, lignes budgétaires) — voir §1 et §8

## Consommateurs prévus

- RFC-TEAM-007 — affectation collaborateur ↔ charge : FK optionnelle ou obligatoire vers `activityTypeId` selon arbitrage produit
- RFC-TEAM-008 — staffing projet : filtrage / regroupement par taxonomie
- RFC-TEAM-009 — timesheet : colonne « type d’activité » alimentée par ce référentiel
- RFC-FE-TEAM-005 (UI affectations) — selects labellisés

---

# 1. Analyse de l’existant

**Constats**

- Le schéma Prisma comporte déjà des notions voisines mais **non substituables** à la taxonomie « équipes / staffing » :
  - **`ProjectKind`** (`PROJECT` \| `ACTIVITY`) : distingue un projet structuré d’une activité de suivi au sein de l’entité `Project` (voir commentaire schema).
  - **`ProjectType`** : typologie **métier projet** (transformation, infra, etc.), pas la même granularité que PROJECT / RUN / SUPPORT.
  - **`ProjectActivity`** (RFC-PROJ-011) : activité **dérivée d’une tâche** avec récurrence — objet de pilotage projet, pas le référentiel générique de charge équipe.
  - **`BudgetEnvelopeType`** (`RUN` \| `BUILD` \| `TRANSVERSE`) : enveloppe budgétaire ; recoupe partiellement la sémantique « RUN / TRANSVERSE » mais reste dans le domaine **finance**, pas un catalogue équipe.
  - **`FinancialSourceType`** : typage de source financière (dont `PROJECT`, `TEAM_ASSIGNMENT`, etc.) pour le moteur transversal.

**Besoin produit**

- Pour **affectations**, **staffing** et **temps passés**, il faut une **axe stable et comparable** entre clients : classifier le travail en **PROJECT** (chantier livrable / projet), **RUN** (exploitation récurrente), **SUPPORT** (assistance, MCO, helpdesk…), **TRANSVERSE** (fonctions support transverses : RH, qualité, PMO…), **OTHER** (résiduel / cas non couverts).
- Ce référentiel doit être **extensible par client** : libellés adaptés, codes métiers, éventuellement **plusieurs lignes par axe** (ex. plusieurs types « RUN » métiers) tout en conservant l’**axe sémantique** (`kind`) pour le reporting et les règles transverses futures.

**Objectif de cette RFC**

Définir le **modèle de données**, les **règles métier**, les **API REST**, le **RBAC** et l’**audit** pour un référentiel **`ActivityType`** (nom de travail) par client, portant un **`kind`** canonique parmi les cinq valeurs ci-dessus, avec CRUD, archivage, seed par client et listes pour les sélections UI.

---

# 2. Hypothèses éventuelles

- Chaque entrée du référentiel est **strictement limitée** à un `clientId` ; aucune fuite inter-client.
- Les **cinq valeurs** `PROJECT`, `RUN`, `SUPPORT`, `TRANSVERSE`, `OTHER` sont figées en **enum Prisma** `ActivityTaxonomyKind` (ou nom équivalent) : elles constituent le **langage commun** reporting / intégrations ; l’extension client se fait par **nouvelles lignes** (nouveaux `name` / `code`) **sous le même `kind`**, pas par ajout de nouveaux `kind` dynamiques.
- À l’onboarding client (ou migration), le produit peut **poser cinq enregistrements système** (un par `kind`) avec libellés français par défaut ; l’admin client peut **renommer** les libellés et en **ajouter** d’autres pour le même `kind`.
- Un **code métier** optionnel est unique **par client** lorsqu’il est renseigné (contrainte `@@unique([clientId, code])` avec gestion des `null` si le SGBD l’exige — sinon validation applicative).
- L’**archivage logique** préserve les FK historiques sur affectations / temps (quand ces modules existeront) : les entrées archivées ne apparaissent pas dans les sélections par défaut.
- Les permissions sont **distinctes** des modules `projects` et `budgets` : module dédié (ex. `activity-types` ou sous-module `teams`) avec permissions `activity_types.read` / `activity_types.manage` (noms exacts à figer au seed).
- **Pas d’obligation** au MVP de lier automatiquement `ActivityType` à `Project` ou `BudgetEnvelope` : des **règles de mapping** pourront être introduites dans une RFC ultérieure (suggestions en §8).

---

# 3. Liste des fichiers à créer / modifier

## Prisma

- `apps/api/prisma/schema.prisma` — enum `ActivityTaxonomyKind`, modèle `ActivityType`, indexes `clientId`, contraintes d’unicité
- Migration dédiée (ex. `20260404120000_add_activity_types_team006`)

## Backend (NestJS) — module `activity-types`

- `apps/api/src/modules/activity-types/activity-types.module.ts`
- `apps/api/src/modules/activity-types/activity-types.controller.ts`
- `apps/api/src/modules/activity-types/activity-types.service.ts`
- `apps/api/src/modules/activity-types/activity-types-defaults.ts` — fonction pure `ensureDefaultActivityTypes` (partagée service + seed)
- `apps/api/src/modules/activity-types/dto/create-activity-type.dto.ts`
- `apps/api/src/modules/activity-types/dto/update-activity-type.dto.ts`
- `apps/api/src/modules/activity-types/dto/list-activity-types.query.dto.ts`
- `apps/api/src/modules/activity-types/activity-types.service.spec.ts`
- `apps/api/src/modules/activity-types/activity-types.controller.spec.ts`
- `apps/api/src/modules/activity-types/activity-types-defaults.spec.ts`
- `apps/api/src/modules/activity-types/tests/activity-types-seed-permissions.spec.ts`

## Intégration

- `apps/api/src/app.module.ts` — import `ActivityTypesModule`
- `apps/api/src/modules/clients/clients.module.ts` — import `ActivityTypesModule`
- `apps/api/src/modules/clients/clients.service.ts` — `ensureDefaultsForClient` après activation des modules pour le nouveau client
- `apps/api/prisma/seed.ts` — module `activity_types`, permissions, rôle démo « Client admin — équipes métier », passe `ensureDefaultActivityTypesForAllClients`
- `apps/api/prisma/default-profiles.json` — profils Lecteur / Gestionnaire Équipes

## Documentation transverse

- `docs/ARCHITECTURE.md` — entrée module `activity-types` + paragraphe dédié
- `docs/API.md` — section **Équipes — taxonomie des activités** (`/api/activity-types`)
- Ce document ; `docs/RFC/_Plan de déploiement - Equipe.md` ; `docs/RFC/_RFC Liste.md`

---

# 4. Implémentation complète

## 4.1 Enum canonique

```prisma
/// RFC-TEAM-006 — axe sémantique stable (reporting, règles). Non extensible côté données.
enum ActivityTaxonomyKind {
  PROJECT     /// Chantiers, livrables, initiative projetée (alignement conceptuel avec travaux « build »)
  RUN         /// Exploitation, récurrent, maintien en conditions opérationnelles
  SUPPORT     /// Assistance utilisateurs, MCO, helpdesk, proximité métier
  TRANSVERSE  /// Fonctions support organisationnelles (PMO, qualité, RH IT, etc.)
  OTHER       /// Résiduel, divers, ou attente de reclassement
}
```

## 4.2 Modèle `ActivityType`

| Champ | Type | Description |
| --- | --- | --- |
| `id` | `String` (cuid) | Identifiant technique |
| `clientId` | `String` | Portée obligatoire |
| `kind` | `ActivityTaxonomyKind` | Axe sémantique (une des cinq valeurs) |
| `name` | `String` | Libellé affiché (obligatoire) — **valeur métier principale en UI** |
| `code` | `String?` | Code court optionnel (unique par client si présent) |
| `description` | `String?` | Aide à la saisie / glossaire interne |
| `sortOrder` | `Int` | Ordre d’affichage dans les listes et selects (défaut `0`) |
| `isDefaultForKind` | `Boolean` | À utiliser si le client a **plusieurs** types pour un même `kind` : marque la ligne **préférée** pour préremplissage (au plus une `true` par `(clientId, kind)` — contrainte applicative ou unique partielle selon support DB) |
| `archivedAt` | `DateTime?` | Archivage logique ; `null` = actif |
| `createdAt` / `updatedAt` | `DateTime` | Audit technique |

**Relations futures (hors périmètre implémentation minimale de TEAM-006)**

- `TeamAssignment.activityTypeId` (RFC-TEAM-007) — FK optionnelle ou obligatoire
- `TimeEntry.activityTypeId` (RFC-TEAM-009) — idem

Indexes recommandés : `@@index([clientId])`, `@@index([clientId, kind])`, `@@index([clientId, archivedAt])`.

## 4.3 Règles métier

1. **Création** : `name` non vide ; `kind` obligatoire ; validation `code` unique par client si fourni.
2. **Archivage** : interdit si des dépendances métier l’interdisent (à brancher quand les tables consommatrices existeront) ; jusqu’alors archivage libre avec avertissement produit.
3. **Suppression** : préférer archivage ; suppression physique réservée aux cas sans FK (ou policy `Restrict` côté Prisma sur futures relations).
4. **Seed par client** : créer les cinq entrées avec `name` par défaut (ex. « Projet », « Run — exploitation », « Support », « Transverse », « Autre ») et `sortOrder` 0–4 ; `isDefaultForKind = true` pour chacune tant qu’aucune autre ligne du même `kind` n’existe.

## 4.4 API REST (proposition)

Préfixe `/api` ; toutes les routes scopées **client actif** (header / guard existants).

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/activity-types` | Liste paginée + filtres : `kind`, `includeArchived`, `search` sur name/code |
| `GET` | `/activity-types/:id` | Détail |
| `POST` | `/activity-types` | Création (rôle avec `activity_types.manage`) |
| `PATCH` | `/activity-types/:id` | Mise à jour partielle |
| `POST` | `/activity-types/:id/archive` | Archivage (ou `PATCH` avec `archivedAt`) |
| `POST` | `/activity-types/:id/restore` | Réactivation |

**Réponse liste** : `{ items, total, limit, offset }` ; chaque item inclut `id`, `kind`, `name`, `code`, `description`, `sortOrder`, `isDefaultForKind`, `archivedAt` — **jamais** seulement l’ID pour un affichage utilisateur (les écrans utilisent `name` + badge `kind` lisible).

**DTO**

- `CreateActivityTypeDto` : `kind`, `name`, `code?`, `description?`, `sortOrder?`, `isDefaultForKind?` — `class-validator`
- `UpdateActivityTypeDto` : partiel
- `ListActivityTypesQueryDto` : pagination standard + filtres ci-dessus

## 4.5 RBAC

- `activity_types.read` — lecture listes / détail (profils collaborateur pouvant saisir du temps ou consulter des affectations).
- `activity_types.manage` — création, édition, archivage (typiquement rôle admin client ou référent métier).

Module fonctionnel dans le seed (comme `skills`, `teams`) pour activation par client.

## 4.6 Audit

Journaliser : création, modification, archivage / restauration, avec `clientId`, `activityTypeId`, résumé des champs modifiés (alignement RFC-013).

---

# 5. Modifications Prisma (récapitulatif)

- Ajout enum `ActivityTaxonomyKind`
- Ajout modèle `ActivityType` avec relations `Client` (et futures FK inverses quand TEAM-007 / TEAM-009 seront branchées)

---

# 6. Tests

- **Service** : création avec isolation client ; impossible de lire / modifier une ligne d’un autre client ; unicité `code` ; filtres liste
- **Contrôleur** : JWT + client actif + permission ; validation DTO ; 404 hors scope
- **Seed** : idempotence des cinq lignes par client de test

---

# 7. Récapitulatif final

**RFC-TEAM-006** introduit un **référentiel client** de **types d’activité** portant un **axe canonique** à cinq valeurs (`PROJECT`, `RUN`, `SUPPORT`, `TRANSVERSE`, `OTHER`), **extensible** par des entrées supplémentaires partageant le même `kind`, avec **libellés et codes métiers**, **archivage**, **API REST**, **RBAC** et **audit**, en préparation des modules **affectations** et **temps**. Elle évite la confusion avec `ProjectKind`, `ProjectActivity` et les enveloppes **budget** en documentant les frontières (§1, §8).

---

# 8. Points de vigilance

- **Surcharge terminologique** : en UI et doc utilisateur, distinguer clairement **« type d’activité (taxonomie charge) »** et **« activité projet »** (`ProjectActivity`) ou **« type de projet »** (`ProjectType`).
- **Alignement budget** : une règle métier future pourrait mapper `RUN` / `TRANSVERSE` vers des enveloppes ou axes analytiques — **ne pas** dupliquer les enums budget dans ce référentiel ; prévoir une table de **correspondance** ou un champ optionnel `budgetEnvelopeKind` uniquement si un besoin finance le justifie (hors scope MVP).
- **Alignement projet** : une affectation sur un **projet** peut avoir `kind = PROJECT` et une FK vers `Project` ; une charge **RUN** peut ne référencer aucun projet — les écrans doivent accepter cette combinaison sans forcer un `projectId` pour tout.
- **Unicité `isDefaultForKind`** : si plusieurs lignes sous le même `kind`, garantir une seule défaut ou une logique de fallback explicite côté API (sinon comportement non déterministe pour le préremplissage).
- **Inputs UI** : selects sur `name` + indication du `kind` (badge ou sous-titre) pour que l’utilisateur ne confonde pas deux lignes du même axe ; **jamais** d’UUID affiché seul (règle Starium inputs).

---

# 9. Références croisées

- Plan Équipes : `docs/RFC/_Plan de déploiement - Equipe.md` (ligne RFC-TEAM-006)
- Compétences (pattern référentiel catalogue) : [RFC-TEAM-003](./RFC-TEAM-003%20%E2%80%94%20R%C3%A9f%C3%A9rentiel%20Comp%C3%A9tences.md)
- Équipes / scopes : [RFC-TEAM-005](./RFC-TEAM-005%20%E2%80%94%20R%C3%A9f%C3%A9rentiel%20%C3%89quipes%20p%C3%A9rim%C3%A8tres%20managers.md)
