# RFC-TEAM-008 — Staffing projet par manager / responsable projet

## Statut

Implémentée (backend MVP) — routes projet-scopées déléguant à `TeamAssignmentsService` ; **aucun nouveau modèle métier** (réutilise [RFC-TEAM-007](./RFC-TEAM-007%20%E2%80%94%20Affectations%20ressources.md)). **UI** fiche projet : **RFC-FE-TEAM-005** (UI affectations / staffing projet — à faire ; voir [`_Plan de déploiement - Equipe.md`](./_Plan%20de%20d%C3%A9ploiement%20-%20Equipe.md)).

## Implémentation livrée (référence code)

- **Contrôleur** : [`apps/api/src/modules/projects/project-resource-assignments.controller.ts`](../../apps/api/src/modules/projects/project-resource-assignments.controller.ts) — `@Controller('projects/:projectId/resource-assignments')`, enregistré dans [`projects.module.ts`](../../apps/api/src/modules/projects/projects.module.ts) (import `TeamAssignmentsModule`, contrôleur en tête de la liste).
- **Service** : [`team-assignments.service.ts`](../../apps/api/src/modules/team-assignments/team-assignments.service.ts) — `ensureProjectInClient`, `listForProject`, `getByIdForProject`, `createForProject`, `updateForProject`, `cancelForProject`.
- **DTOs** : [`create-project-resource-assignment.dto.ts`](../../apps/api/src/modules/team-assignments/dto/create-project-resource-assignment.dto.ts), [`update-project-resource-assignment.dto.ts`](../../apps/api/src/modules/team-assignments/dto/update-project-resource-assignment.dto.ts), [`list-project-resource-assignments.query.dto.ts`](../../apps/api/src/modules/team-assignments/dto/list-project-resource-assignments.query.dto.ts) (liste sans filtre projet dans le body ; `projectId` query optionnelle uniquement pour cohérence avec le path — sinon **400** si contradictoire).
- **RBAC** : uniquement `team_assignments.read` / `team_assignments.manage` (pas de `projects.*` sur ces handlers — contrainte `PermissionsGuard`, un seul préfixe de module par route). **Guards** : `JwtAuthGuard` → `ActiveClientGuard` → `ModuleAccessGuard` → `PermissionsGuard`.
- **Tests** : [`project-resource-assignments.controller.spec.ts`](../../apps/api/src/modules/projects/project-resource-assignments.controller.spec.ts), extension [`team-assignments.service.spec.ts`](../../apps/api/src/modules/team-assignments/team-assignments.service.spec.ts).
- **API documentée** : [docs/API.md](../API.md) (section Équipes — affectations projet-scopées).

## Priorité

Très haute — **Phase 3** du plan Équipes ; réponse directe au besoin **« depuis le projet, affecter la charge des équipes sur les activités (taxonomie) »**. Suite naturelle de **TEAM-007** ; prérequis UX pour **RFC-FE-TEAM-005** (onglet / panneau staffing projet).

## Dépendances

- [RFC-TEAM-007](./RFC-TEAM-007%20%E2%80%94%20Affectations%20ressources.md) — entité `TeamResourceAssignment`, API `/team-resource-assignments`, règles `projectId` + `activityTypeId`
- [RFC-TEAM-006](./RFC-TEAM-006%20%E2%80%94%20Taxonomie%20des%20activit%C3%A9s.md) — sélection du type d’activité (kind + libellés client)
- Module **Projets** — `Project`, `ownerUserId`, `sponsorUserId`, équipe projet (`ProjectTeamMember`, `ProjectTeamRole`)
- [RFC-TEAM-005](./RFC-TEAM-005%20%E2%80%94%20R%C3%A9f%C3%A9rentiel%20%C3%89quipes%20p%C3%A9rim%C3%A8tres%20managers.md) — filtrage lecture selon périmètre manager (collaborateurs visibles)
- `docs/ARCHITECTURE.md` — multi-client, client actif
- `docs/FRONTEND_UI-UX.md` — fiche projet, onglets workspace, états loading / empty
- `.cursorrules` — **inputs UI : libellés métier**, jamais d’UUID seul

## Consommateurs prévus

- **RFC-FE-TEAM-005** — UI affectations (vue équipe **et** vue projet)
- **RFC-TEAM-009** — préremplissage timesheet à partir des lignes de staffing du projet
- **RFC-TEAM-011 / 012** — charge planifiée agrégée par projet

---

# 1. Analyse de l’existant

## 1.1 Rappel TEAM-007 vs besoin « vue projet »

| Élément | Rôle |
| --- | --- |
| **`TeamResourceAssignment`** | Ligne de **charge planifiée** : collaborateur, **projet optionnel**, **type d’activité** obligatoire, période, rôle, % allocation. |
| **API générique** `GET/POST/PATCH … /team-resource-assignments` | Suffisante pour créer une affectation **en fixant `projectId`** dans le body. |
| **Manque côté produit** | Parcours **contextualisé projet** : liste filtrée, création avec `projectId` **verrouillé**, droits **responsable / sponsor / PM** sans exposer le détail technique, et **cohérence** avec l’équipe projet affichée. |

**Constat** : TEAM-007 fournit la **vérité** ; TEAM-008 définit **qui** agit depuis la fiche projet, **comment** l’UI et les routes se comportent, et **quelles** permissions combiner.

## 1.2 Distinctions utiles

| Concept | Rôle | Rapport avec staffing |
| --- | --- | --- |
| **`ProjectTeamMember`** | Roster : rôles projet, user ou libellé libre. | **Complémentaire** : indique « qui est dans l’équipe projet » **sans** temporalité ni %. Ne remplace pas une ligne `TeamResourceAssignment`. |
| **`TeamResourceAssignment`** | Charge **planifiée** sur une période. | Peut cibler un collaborateur **présent ou non** dans `ProjectTeamMember` (ex. renfort planifié avant mise à jour du roster). |
| **`ActivityType` (TEAM-006)** | Axe PROJECT / RUN / … | Pour une affectation **liée au projet**, `activityTypeId` reste **obligatoire** (souvent un type de **kind** `PROJECT` pour ce client). |
| **`ownerUserId` / `sponsorUserId`** | Pilotage projet côté `User`. | Sert de base pour une politique **« le responsable peut staffer son projet »** sans conflit avec le référentiel `Collaborator`. |

## 1.3 Objectif de la RFC

1. Permettre au **manager de ligne**, au **responsable projet** (owner) et aux rôles **staffing** habilités de **lire et saisir** les affectations **dont le `projectId` est celui du projet ouvert**, depuis le **workspace Projet**.
2. Garantir **isolation client** et **respect des périmètres** (TEAM-005) : un manager ne staff que des collaborateurs **dans son périmètre** si la politique RBAC le impose.
3. Exposer des **points d’entrée API** clairs (réutilisant le service TEAM-007) : filtre `projectId` obligatoire côté route « projet », création avec projet implicite.
4. Décrire l’**UX** (onglet ou section, tableaux, formulaires) alignée **FRONTEND_UI-UX** — détail d’implémentation dans **RFC-FE-TEAM-005**.

---

# 2. Hypothèses éventuelles

1. **Pas de duplication de données** — Les créations / mises à jour passent par le **même** service que TEAM-007 ; les routes « sous projet » sont des **adaptateurs** (fixent `projectId`, vérifient l’accès au projet).

2. **Qui peut écrire** — Arbitrage produit (à figer au seed / profils) :
   - **Minimum** : `team_assignments.manage` **et** `projects.read` sur le client, **et** le projet est accessible (même `clientId`).
   - **Option « responsable projet »** : en plus, soit `projects.update`, soit l’utilisateur courant est `ownerUserId` ou `sponsorUserId` **ou** membre d’une liste étendue (future : rôle COPIL) — **une seule règle** retenue par implémentation pour éviter les ambiguïtés.

3. **Collaborateurs sélectionnables** — La liste des collaborateurs pour le select doit respecter **TEAM-005** (périmètre manager) + **lecture** `collaborators.read` ou équivalent ; les réponses API restent **enrichies** (`displayName`, etc.).

4. **Type d’activité par défaut** — À l’ouverture du formulaire « nouvelle affectation » depuis un projet, pré-sélectionner le **`ActivityType` par défaut pour `kind` = `PROJECT`** du client (TEAM-006), avec possibilité de changer si plusieurs lignes existent.

5. **Lien roster ↔ staffing (MVP)** — Aucune obligation d’auto-créer `ProjectTeamMember` lors d’une affectation ; **option** ultérieure : suggestion « ajouter au roster » si le collaborateur staffé a un `User` lié et n’est pas encore dans l’équipe projet.

---

# 3. Liste des fichiers à créer / modifier

## Backend (livré — Option A)

- Contrôleur `ProjectResourceAssignmentsController` dans le module **projets**, déléguant à **`TeamAssignmentsService`**
- Routes sous `/api/projects/:projectId/resource-assignments` — voir §4.2
- DTOs : `CreateProjectResourceAssignmentDto` / `UpdateProjectResourceAssignmentDto` / `ListProjectResourceAssignmentsQueryDto` — **sans** `projectId` dans les corps (injection depuis le path côté service)
- Guards standards Starium (`JwtAuthGuard` → … → `PermissionsGuard`) ; permissions **`team_assignments.*` uniquement**
- Tests unitaires contrôleur + service — voir §6

## Frontend (spécification — détail RFC-FE-TEAM-005)

- Route workspace projet : onglet **« Charge / Staffing »** ou équivalent
- Composants : tableau des affectations, dialogue création / édition, query keys incluant `clientId` et `projectId`

## Documentation

- Ce document ; [docs/API.md](../API.md) ; [docs/ARCHITECTURE.md](../ARCHITECTURE.md) — alignés sur l’implémentation backend.

---

# 4. Implémentation complète

## 4.1 Règles métier (vue projet)

1. **Lecture** — Retourner uniquement les `TeamResourceAssignment` avec `projectId = :projectId`, `clientId` = client actif. **Périmètre manager (TEAM-005)** : non appliqué dans ce lot backend — parité avec `GET /api/team-resource-assignments` (évolution possible ultérieure).

2. **Création** — `projectId` **imposé** par l’URL ; le body contient `collaboratorId`, `activityTypeId`, `roleLabel`, période, `allocationPercent`, champs optionnels TEAM-007 (`projectTeamRoleId`, `notes`). Validation identique à TEAM-007 pour la cohérence `ActivityType` / projet.

3. **Mise à jour / annulation** — Même logique que TEAM-007, avec contrôle que l’affectation appartient bien au **projet** de l’URL (anti-ID enumeration cross-projet).

4. **Cohérence avec `Project.kind`** — Aucune règle supplémentaire imposée par cette RFC au-delà des règles projet existantes ; un `ProjectKind.ACTIVITY` reste un conteneur projet valide pour le staffing.

## 4.2 API REST (convenience — préfixe `/api`)

Toutes les routes : JWT, client actif, module **`team_assignments`** activé pour le client (`ModuleAccessGuard` déduit du préfixe `team_assignments` sur les permissions). **Pas** de permission `projects.*` sur ces handlers (le `PermissionsGuard` n’autorise qu’un seul préfixe de module par route).

| Méthode | Chemin | Description |
| --- | --- | --- |
| `GET` | `/projects/:projectId/resource-assignments` | Liste paginée `{ items, total, limit, offset }` — affectations **de ce projet** |
| `POST` | `/projects/:projectId/resource-assignments` | Création ; `projectId` imposé par l’URL (interdit dans le body) |
| `POST` | `/projects/:projectId/resource-assignments/:assignmentId/cancel` | Annulation logique (délégation `TeamAssignmentsService.cancel`) |
| `GET` | `/projects/:projectId/resource-assignments/:assignmentId` | Détail — **404** si inconnu ou affectation d’un autre projet |
| `PATCH` | `/projects/:projectId/resource-assignments/:assignmentId` | Mise à jour partielle — pas de `projectId` dans le body |

**Query `GET` (liste)** : `collaboratorId`, `activityTypeId`, `includeCancelled`, `from`/`to`, `activeOn`, `limit`, `offset` (règles temporelles identiques à TEAM-007) ; filtre projet = path. Si `projectId` en query **≠** path → **400**.

**Réponses** — Identiques à TEAM-007 (`TeamResourceAssignmentResponse`).

## 4.3 RBAC (implémenté)

| Permission | Routes |
| --- | --- |
| `team_assignments.read` | `GET` liste, `GET` détail |
| `team_assignments.manage` | `POST` création, `PATCH` mise à jour, `POST` cancel |

**Hors livraison backend actuelle** : combinaison `projects.read` + `team_assignments.*` sur une même route, et règle « responsable projet uniquement » (§2.2) — évolutions possibles (garde dédié, évolution guards).

**Note** : l’accès à l’écran projet côté UI reste conditionné au module Projets ; l’API ci-dessus ne vérifie pas `projects.read` sur chaque appel.

## 4.4 Audit (RFC-013)

Réutiliser les mêmes événements que TEAM-007, avec **contexte** `projectId` et `projectCode` dans le payload d’audit pour faciliter la recherche métier « par projet ».

## 4.5 UX (résumé — détail FE-TEAM-005)

- **Emplacement** : onglet dédié dans la fiche projet (bandeau `ProjectWorkspaceTabs`), après **Équipe** ou **Pilotage** selon l’arborescence retenue.
- **Tableau** : colonnes — Collaborateur (nom), Type d’activité (nom + badge `kind`), Rôle, Période, % charge, Statut (actif / annulé), actions.
- **Formulaire** : `Combobox` collaborateur (libellé), select type d’activité (libellés + filtre sur kinds pertinents pour un projet), champs période et %, rôle texte ou lien `ProjectTeamRole` si présent.
- **Empty state** : message incitatif + CTA « Affecter un collaborateur ».
- **Valeur affichée, pas ID** : conformité stricte `.cursorrules` / `inputs-value-not-id.mdc`.

---

# 5. Modifications Prisma

**Aucune** pour cette RFC — le modèle `TeamResourceAssignment` et ses relations sont définis dans **TEAM-007** (déjà présents dans le schéma cible).

Si l’implémentation ajoute un champ d’audit « dernier éditeur », le faire dans le cadre TEAM-007 ou une RFC transverse audit.

---

# 6. Tests

- **Contrôleur** : métadonnées `RequirePermissions` par route ; ordre des handlers documenté en spec.
- **404** : projet inconnu pour le client (`ensureProjectInClient`) ; affectation qui n’appartient pas au `projectId` du path (get / patch / cancel).
- **400** : `projectId` en query contradictoire avec le path (liste).
- **Service** : `createForProject` injecte le `projectId` du path ; `cancelForProject` conserve l’idempotence de `cancel` (TEAM-007).

---

# 7. Récapitulatif final

**RFC-TEAM-008** ne crée pas une nouvelle entité : elle **spécifie le staffing depuis le projet** — routes dédiées, **règles d’accès** pour managers / responsables, **pré-remplissage** taxonomie projet, et **UX** cohérente avec la fiche projet. Elle s’appuie sur **TEAM-007** pour la persistance et la validation, sur **TEAM-006** pour les types d’activité, et sur le module **Projets** pour le contexte et les rôles `owner` / `sponsor`.

---

# 8. Points de vigilance

- **Ne pas** confondre **effectif projet** (`ProjectTeamMember`) et **charge planifiée** : communication produit claire dans les libellés UI.
- **Permissions** : éviter que seul un admin client puisse staffer si l’objectif est le **responsable projet** — sinon la fonctionnalité ne sert pas le cas d’usage nominal.
- **Périmètre manager** : une incohérence entre « je vois le projet » et « je ne vois pas le collaborateur » doit produire un **empty** ou un message explicite, pas une erreur 500.
- **Performance** : index `@@index([clientId, projectId])` déjà prévu côté TEAM-007 ; listes paginées.
- **Nommage UI** — Préférer **« Charge planifiée »** / **« Affectations »** plutôt que « ressource » seul (ambigu avec le référentiel `Resource`).

---

# 9. Références croisées

- [RFC-TEAM-007](./RFC-TEAM-007%20%E2%80%94%20Affectations%20ressources.md)
- [RFC-TEAM-006](./RFC-TEAM-006%20%E2%80%94%20Taxonomie%20des%20activit%C3%A9s.md)
- Plan Équipes : [`docs/RFC/_Plan de déploiement - Equipe.md`](./_Plan%20de%20d%C3%A9ploiement%20-%20Equipe.md)
- UI : RFC-FE-TEAM-005 (à synchroniser sur les routes finales)
