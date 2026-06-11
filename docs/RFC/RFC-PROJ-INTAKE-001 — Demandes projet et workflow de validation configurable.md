# RFC-PROJ-INTAKE-001 — Demandes projet et workflow de validation configurable

## Statut

**Implémenté (MVP)** — 2026-06-03

## Priorité

Haute

## Domaine

Module Projets

## Objectif

Mettre en place une couche amont au module Projets permettant à un collaborateur ou à un utilisateur habilité de créer une **demande projet**.

Une demande projet représente une intention, un besoin métier ou une opportunité à instruire. Elle ne doit pas être considérée comme un projet actif.

Le projet est créé uniquement si la demande est validée selon le workflow choisi par le client.

**Références**

| Document | Lien |
| -------- | ---- |
| Cadrage module Projets | [RFC-PROJ-001](./RFC-PROJ-001%20%E2%80%94%20Cadrage%20fonctionnel%20du%20module%20Projets.md) |
| CRUD projets / portefeuille | Code `apps/api/src/modules/projects/` — cadrage [RFC-PROJ-001](./RFC-PROJ-001%20%E2%80%94%20Cadrage%20fonctionnel%20du%20module%20Projets.md) |
| Cycles de pilotage (routage futur) | [RFC-PROJ-CYCLE-001](./RFC-PROJ-CYCLE-001%20%E2%80%94%20Governance%20Cycles%20Core%20Backend.md), [RFC-PROJ-CYCLE-003](./RFC-PROJ-CYCLE-003%20%E2%80%94%20Governance%20Cycle%20Instances%20and%20Configurable%20Propagation.md) |
| Pattern paramètres workflow client | `ClientBudgetWorkflowSettings` — `GET\|PATCH /api/clients/active/budget-workflow-settings` |
| RBAC modules | [RFC-011](./RFC-011-roles-permissions-modules.md) |
| Audit | [RFC-013](./RFC-013%20%E2%80%94%20Audit%20logs.md) |
| Multi-client | [ARCHITECTURE.md](../ARCHITECTURE.md) §4 |
| UI (libellés, pas ID) | [FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md) |

**Hors scope immédiat (RFCs futures)** : lien instance cycle ↔ demande (ODJ séance), validation multi-niveaux, règles budgétaires automatiques, notifications avancées (règles configurables admin) au-delà du socle RFC-038.

---

# Partie I — Cadrage technique (méthode RFC)

## I.1 Analyse de l’existant

### Backend

- Le module **Projets** expose déjà CRUD, fiche, tâches, risques, scénarios, documents et intégration cycles (`/api/projects`, `governance-cycles`).
- Le modèle **`Project`** possède un statut **`DRAFT`** (`enum ProjectStatus`) — utilisable pour la conversion « brouillon projet » sans nouvel enum projet.
- Champs projet utiles à la conversion : `name`, `description`, `estimatedCost` (aligné `ProjectRequest.estimatedBudget`).
- La création projet (`ProjectsService.create`) exige aujourd’hui des champs structurels (`code`, `type`, `priority`, `criticality`, etc.) — la conversion depuis une demande devra **dériver des valeurs par défaut client-safe** documentées en §I.4 (pas de formulaire projet complet côté demandeur).
- **Livré (MVP 2026-06-03)** : entités `ProjectRequest`, `ProjectRequestWorkflowSettings`, `ProjectRequestAutoAclGrant` ; routes `/api/project-requests` ; paramètres `GET|PATCH /api/clients/active/project-request-workflow-settings` ; module catalogue **`project_requests`** (distinct de `projects` pour `ModuleAccessGuard`).
- **Compléments (2026-06-09)** : notifications in-app + e-mail (socle RFC-038) à la soumission (validateur) et à la décision (demandeur) ; décision **réservée au validateur désigné** ; intégration **pool cycle de pilotage** (`GovernanceCycleItem` CANDIDATE + projet brouillon lié) si module `governance_cycles` actif et cycle configuré actif ; paramètre client `defaultGovernanceCycleId` ; PATCH settings réservé **CLIENT_ADMIN** ; UI création en modale avec champs métier (`expectedBenefits`, etc.).
- **Cycles de pilotage** : candidature projet via `POST …/candidacies` ([RFC-PROJ-CYCLE-003](./RFC-PROJ-CYCLE-003%20%E2%80%94%20Governance%20Cycle%20Instances%20and%20Configurable%20Propagation.md)). Le routage `PILOTING_CYCLE` **crée** désormais un `GovernanceCycleItem` en statut `CANDIDATE` sur le cycle configuré (`defaultGovernanceCycleId`) **si** le module et le cycle sont actifs au moment de l’approbation ; sinon la demande reste `APPROVED` en attente (`NOT_ROUTED`).
- **Paramètres workflow par client** : précédent fonctionnel sur `Client.budgetWorkflowConfig` + service dédié (`client-budget-workflow-settings.service.ts`) — même pattern recommandé avec table dédiée `ProjectRequestWorkflowSettings` (listes d’IDs, enums typés).

### Frontend

- Navigation projets : `/projects`, fiche `/projects/[projectId]`, **demandes** `/projects/requests` (+ `/new` legacy → modale, `/[id]`) — entrée sidebar « Demandes projet » si `project_requests.read` **et** module visible (pas pour tous les détenteurs de `projects.read` seul).
- Administration client : `/client/administration/project-request-workflow` — **CLIENT_ADMIN** : cible après approbation + cycle de pilotage cible si option « pool cycle ».
- Règle produit : **afficher demandeur / validateur / statut en libellé métier**, jamais UUID seul ([FRONTEND_UI-UX.md](../FRONTEND_UI-UX.md)).

### Sécurité

- Guards standards : `JwtAuthGuard`, `ActiveClientGuard`, `ModuleAccessGuard`, `PermissionsGuard`.
- Isolation : `clientId` depuis le contexte actif ; **jamais** `clientId` en body write.

---

## I.2 Hypothèses éventuelles

- Une **demande** et un **projet** sont des agrégats distincts ; le lien est `convertedProjectId` (optionnel, unique logique métier).
- Le **backlog projet** au MVP = vue filtrée des demandes `routingStatus = ROUTED_TO_PROJECT_BACKLOG` — pas de table `ProjectBacklogItem`.
- **`defaultApprovedTarget`** s’applique **automatiquement** à l’action `APPROVE` (sauf `MANUAL_DECISION` qui laisse le routage à une action ultérieure).
- Le validateur MVP est **une seule personne** désignée (`validatorUserId`) ; pas de file d’approbation.
- Les listes `authorizedValidatorUserIds` / `authorizedRoutingUserIds` vides signifient « pas de restriction par liste » **mais** la permission `project_requests.validate` / `project_requests.route` reste un chemin d’éligibilité.
- Si **aucun** validateur éligible n’existe au moment de la soumission → erreur métier explicite (`PROJECT_REQUEST_VALIDATOR_REQUIRED`).
- Notifications ([§11](#11-notifications)) : best-effort via socle **RFC-038** (`Notification` + e-mail) ; échec **ne bloque pas** la transition.
- Champ optionnel `pilotingCycleInstanceId` sur `ProjectRequest` : **non créé** dans le MVP ; branchement cycle = RFC dédiée après accord produit.
- Conversion projet : transaction Prisma `$transaction` ; en cas d’échec, rollback complet de la demande.

---

## I.3 Liste des fichiers à créer / modifier

### Prisma / seed

| Fichier | Action |
| ------- | ------ |
| `apps/api/prisma/schema.prisma` | Modèles `ProjectRequest`, `ProjectRequestWorkflowSettings`, enums §5 |
| `apps/api/prisma/migrations/<timestamp>_project_requests/` | Migration |
| `apps/api/prisma/seed.ts` | `ensureProjectRequestsModuleAndPermissions()` — module catalogue `project_requests` + 6 permissions |
| `apps/api/prisma/migrations/20260603120000_rfc_proj_intake_001_project_requests/` | Migration livrée |
| `apps/api/prisma/migrations/20260609130000_project_request_workflow_governance_cycle/` | `defaultGovernanceCycleId` sur settings |
| `apps/api/prisma/default-profiles.json` | Profils démo (lecteur / contributeur / validateur PMO selon besoin produit) |

### Backend — module `project-requests` (nouveau)

| Fichier | Action |
| ------- | ------ |
| `apps/api/src/modules/project-requests/project-requests.module.ts` | Module Nest |
| `apps/api/src/modules/project-requests/project-requests.controller.ts` | CRUD + routes workflow |
| `apps/api/src/modules/project-requests/project-requests.service.ts` | Règles métier, transitions |
| `apps/api/src/modules/project-requests/project-request-workflow.service.ts` | Application `defaultApprovedTarget`, routage |
| `apps/api/src/modules/project-requests/project-request-piloting-cycle-routing.service.ts` | Pool cycle : projet brouillon lié + `GovernanceCycleItem` CANDIDATE |
| `apps/api/src/modules/project-requests/project-request-governance-cycle.util.ts` | Module `governance_cycles` actif + cycle « ouvert » au pool |
| `apps/api/src/modules/project-requests/project-request-access.helpers.ts` | Wrappers `AccessControlService` (`PROJECT_REQUEST`) |
| `apps/api/src/modules/project-requests/project-request-acl.bootstrap.ts` | Policy DEFAULT + ACL auto demandeur/validateur |
| `apps/api/src/modules/project-requests/project-request-membership.util.ts` | Garde-fous licence (`evaluateLicenseGate`) |
| `apps/api/src/modules/project-requests/project-request-user.util.ts` | `toUserSummary` pour réponses API |
| `apps/api/src/modules/project-requests/dto/*.ts` | create, update, submit, decision, route, cancel, list query |
| `apps/api/src/modules/project-requests/project-requests.service.spec.ts` | Unit tests transitions / validateurs |
| `apps/api/src/modules/project-requests/project-requests.controller.spec.ts` | Controller + isolation client |
| `apps/api/src/app.module.ts` | Import module |

### Backend — paramètres client

| Fichier | Action |
| ------- | ------ |
| `apps/api/src/modules/clients/client-project-request-workflow-settings.controller.ts` | `GET\|PATCH active/project-request-workflow-settings` |
| `apps/api/src/modules/clients/client-project-request-workflow-settings.service.ts` | `stored` / `resolved`, validation FK users/roles client |
| `apps/api/src/modules/clients/dto/update-client-project-request-workflow-settings.dto.ts` | PATCH body |
| `apps/api/src/modules/clients/clients.module.ts` | Providers + controller |

### Backend — conversion projet

| Fichier | Action |
| ------- | ------ |
| `apps/api/src/modules/project-requests/project-request-to-project.converter.ts` | Mapping demande → `CreateProjectDto` / appel `ProjectsService` |
| `apps/api/src/modules/projects/projects.module.ts` | Export si nécessaire pour injection |

### Documentation API

| Fichier | Action |
| ------- | ------ |
| `docs/API.md` | Section `/api/project-requests`, settings actives |

### Frontend

| Fichier | Action |
| ------- | ------ |
| `apps/web/src/app/(protected)/projects/requests/page.tsx` | Liste |
| `apps/web/src/app/(protected)/projects/requests/new/page.tsx` | Création (redirige modale) |
| `apps/web/src/app/(protected)/projects/requests/[id]/page.tsx` | Détail |
| `apps/web/src/app/(protected)/client/administration/project-request-workflow/page.tsx` | Paramètres CLIENT_ADMIN |
| `apps/web/src/features/project-requests/` | `api/`, `components/` (`create-project-request-dialog`, `project-request-workflow-settings-page`, …), `constants/` |
| Navigation shell (sidebar projets) | Entrée « Demandes projet » si `project_requests.read` |

---

## I.4 Implémentation — notes de conversion projet

Lors de `DRAFT_PROJECT` (auto ou routage manuel), créer un `Project` avec au minimum :

| Champ demande | Champ projet | Règle MVP |
| ------------- | ------------ | --------- |
| `title` | `name` | Copie directe |
| `description` | `description` | Copie |
| `estimatedBudget` | `estimatedCost` | Si renseigné |
| — | `status` | **`DRAFT`** (existe dans `ProjectStatus`) |
| — | `code` | Généré : préfixe `REQ-` + suffixe court dérivé de l’id demande ou séquence client |
| — | `type` | Défaut applicatif documenté (ex. `ProjectType` le plus neutre du seed client) |
| — | `priority` | Mapper depuis `urgency` si table de correspondance simple, sinon `MEDIUM` |
| — | `criticality` | Défaut `LOW` ou équivalent seed |
| — | `kind` | `PROJECT` |

Réutiliser `ProjectsService.create` dans une transaction avec mise à jour `ProjectRequest` pour garantir audit + cohérence.

**Ownership** : si `ORG_OWNERSHIP_REQUIRED` actif, appliquer les mêmes garde-fous que création projet manuelle (erreur explicite ou `ownerOrgUnitId` nullable selon politique client — à trancher en revue ; ne pas contourner `ownershipPolicy`).

---

# Partie II — Spécification produit

## 1. Problème à résoudre

Aujourd’hui, le module Projets permet de gérer des projets structurés : fiche projet, tâches, risques, jalons, scénarios, budget, documents et pilotage.

Mais il manque une étape amont permettant de capter les demandes terrain avant leur intégration dans le portefeuille projet.

Sans cette couche amont :

* les idées sont saisies directement comme projets ;
* le portefeuille projet risque d’être pollué par des brouillons ou demandes non qualifiées ;
* les besoins métiers ne suivent pas un circuit de validation clair ;
* il n’est pas possible de tracer qui a demandé, qui a validé et quelle décision a été prise ;
* le client ne peut pas adapter son mode de gouvernance projet.

---

## 2. Principe produit

La demande projet est une entité distincte du projet.

Elle suit un workflow simple :

```text
Demande projet
↓
Soumission
↓
Validation par un validateur
↓
Application du workflow client
↓
Cycle de pilotage OU brouillon projet OU backlog projet
↓
Création du projet uniquement si la décision le permet
```

Une demande validée ne signifie pas automatiquement qu’un projet actif existe.

La validation confirme que la demande peut continuer dans le processus défini par le client.

---

## 3. Périmètre MVP

### Inclus

Le MVP doit permettre :

* de créer une demande projet ;
* de modifier une demande tant qu’elle est en brouillon ou en demande de complément ;
* de choisir un validateur autorisé ;
* de soumettre la demande ;
* au validateur d’approuver, refuser ou demander un complément ;
* de configurer le comportement après validation ;
* de router la demande vers :
  * un cycle de pilotage ;
  * un brouillon projet ;
  * un backlog projet ;
  * une décision manuelle ;
* de créer un projet depuis une demande validée lorsque le workflow le prévoit ;
* de tracer les décisions par audit logs ;
* d’afficher les demandes dans une interface dédiée.

### Hors périmètre

Cette RFC ne doit pas implémenter :

* un moteur de règles automatique complexe ;
* une validation multi-niveaux DSI / DAF / DG automatique ;
* des seuils budgétaires dynamiques ;
* une matrice avancée de workflow ;
* une IA de qualification ;
* une synchronisation Microsoft ;
* un lien automatique avec les budgets ;
* une création automatique de scénarios projet ;
* un système de notification avancé hors notifications existantes éventuelles.

---

## 4. Définitions métier

### Demande projet

Une demande projet est une proposition ou un besoin émis par un collaborateur.

Elle peut devenir :

* un projet ;
* un brouillon projet ;
* une entrée de backlog projet ;
* une demande à arbitrer dans un cycle de pilotage ;
* une demande refusée.

### Validateur

Le validateur est l’utilisateur chargé de décider si la demande peut continuer dans le workflow.

Dans le MVP, il est sélectionné manuellement parmi une liste d’utilisateurs autorisés.

### Workflow client

Le workflow client définit ce qui se passe après l’approbation d’une demande.

Exemples :

* envoyer au cycle de pilotage ;
* créer un brouillon projet ;
* mettre en backlog projet ;
* laisser le validateur choisir manuellement la destination.

---

## 5. Modèle de données

### 5.1 Nouveau modèle Prisma : `ProjectRequest`

```prisma
model ProjectRequest {
  id        String @id @default(cuid())
  clientId  String

  title       String
  description String?

  requesterUserId String
  validatorUserId String?

  status ProjectRequestStatus @default(DRAFT)

  urgency ProjectRequestUrgency?
  estimatedBudget Decimal? @db.Decimal(18, 2)
  expectedBenefits String?
  businessContext String?
  riskIfNotDone String?

  routingTarget ProjectRequestRoutingTarget?
  routingStatus ProjectRequestRoutingStatus @default(NOT_ROUTED)

  decisionComment String?
  decidedByUserId String?
  decidedAt DateTime?

  needsMoreInfoComment String?

  convertedProjectId String?
  routedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  requester User @relation("ProjectRequestRequester", fields: [requesterUserId], references: [id], onDelete: Restrict)
  validator User? @relation("ProjectRequestValidator", fields: [validatorUserId], references: [id], onDelete: SetNull)
  decidedBy User? @relation("ProjectRequestDecidedBy", fields: [decidedByUserId], references: [id], onDelete: SetNull)
  convertedProject Project? @relation(fields: [convertedProjectId], references: [id], onDelete: SetNull)

  @@index([clientId])
  @@index([clientId, status])
  @@index([clientId, requesterUserId])
  @@index([clientId, validatorUserId])
  @@index([clientId, routingTarget])
  @@index([convertedProjectId])
}
```

> **Note revue** : ajouter les relations Prisma `User` / `Project` ci-dessus lors de l’implémentation ; `routingStatus` default `NOT_ROUTED` explicite en schéma.

### 5.2 Nouveau modèle Prisma : `ProjectRequestWorkflowSettings`

```prisma
model ProjectRequestWorkflowSettings {
  id       String @id @default(cuid())
  clientId String @unique

  defaultApprovedTarget ProjectRequestRoutingTarget @default(MANUAL_DECISION)

  validatorSelectionMode ProjectRequestValidatorSelectionMode @default(REQUESTER_SELECTS)

  authorizedValidatorUserIds String[] @default([])
  authorizedValidatorRoleIds String[] @default([])

  authorizedRoutingUserIds String[] @default([])
  authorizedRoutingRoleIds String[] @default([])

  allowRequesterToSelectValidator Boolean @default(true)
  allowValidatorToChooseRoutingTarget Boolean @default(true)

  /// Cycle cible si defaultApprovedTarget = PILOTING_CYCLE
  defaultGovernanceCycleId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)
  defaultGovernanceCycle GovernanceCycle? @relation(fields: [defaultGovernanceCycleId], references: [id], onDelete: SetNull)

  @@index([clientId])
}
```

Création lazy : première lecture settings → ligne par défaut si absente (pattern budget workflow).

### 5.3 Enums

```prisma
enum ProjectRequestStatus {
  DRAFT
  SUBMITTED
  NEEDS_MORE_INFO
  APPROVED
  REJECTED
  CANCELLED
  CONVERTED_TO_PROJECT
}

enum ProjectRequestUrgency {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ProjectRequestRoutingTarget {
  PILOTING_CYCLE
  DRAFT_PROJECT
  PROJECT_BACKLOG
  MANUAL_DECISION
}

enum ProjectRequestRoutingStatus {
  NOT_ROUTED
  ROUTED_TO_PILOTING_CYCLE
  ROUTED_TO_DRAFT_PROJECT
  ROUTED_TO_PROJECT_BACKLOG
}

enum ProjectRequestValidatorSelectionMode {
  REQUESTER_SELECTS
  ADMIN_SELECTS
}
```

---

## 6. Règles métier

### 6.1 Création d’une demande

Un utilisateur disposant de la permission `project_requests.create` peut créer une demande projet.

À la création :

```text
status = DRAFT
routingStatus = NOT_ROUTED
```

Le demandeur est automatiquement l’utilisateur connecté :

```text
requesterUserId = currentUser.id
```

Le `clientId` est toujours celui du client actif via `X-Client-Id`.

Le body ne doit jamais accepter `clientId`.

---

### 6.2 Sélection du validateur

Le demandeur peut sélectionner un validateur si :

```text
allowRequesterToSelectValidator = true
```

et si le validateur fait partie des utilisateurs autorisés.

Un validateur est autorisé si au moins une des conditions est vraie :

* son `userId` est dans `authorizedValidatorUserIds` ;
* il possède un rôle listé dans `authorizedValidatorRoleIds` ;
* il possède la permission `project_requests.validate`.

Le validateur doit obligatoirement être membre actif du client courant (`ClientUser` actif).

Si aucun validateur n’est configuré **et** aucun utilisateur n’est éligible via permission/listes, l’API doit retourner une erreur explicite au moment de la soumission.

---

### 6.3 Soumission d’une demande

Une demande peut passer de `DRAFT` à `SUBMITTED` si :

* le titre est renseigné ;
* la description est renseignée ;
* un validateur valide est affecté ;
* la demande appartient au client actif ;
* l’utilisateur est le demandeur ou dispose de `project_requests.update`.

Transitions autorisées :

```text
DRAFT → SUBMITTED
NEEDS_MORE_INFO → SUBMITTED
```

Une fois soumise, la demande n’est plus modifiable par le demandeur sauf retour en `NEEDS_MORE_INFO`.

---

### 6.4 Décision du validateur

**Seul le validateur désigné** (`validatorUserId === actorUserId`) peut décider sur une demande `SUBMITTED`. Permission route : `project_requests.validate` (+ licence write). Un administrateur avec `project_requests.update` **ne peut pas** décider à la place du validateur.

La demande doit être en statut :

```text
SUBMITTED
```

Actions possibles :

```text
APPROVE
REJECT
REQUEST_MORE_INFO
```

Effets :

```text
APPROVE → status = APPROVED (+ application workflow §6.5)
REJECT → status = REJECTED
REQUEST_MORE_INFO → status = NEEDS_MORE_INFO
```

À chaque décision, stocker :

```text
decidedByUserId
decidedAt
decisionComment
```

En cas de demande de complément, stocker aussi :

```text
needsMoreInfoComment
```

---

### 6.5 Application du workflow client après approbation

Quand une demande passe en `APPROVED`, le système applique le workflow configuré.

Le champ principal est :

```text
defaultApprovedTarget
```

Valeurs possibles :

```text
PILOTING_CYCLE
DRAFT_PROJECT
PROJECT_BACKLOG
MANUAL_DECISION
```

#### Cas 1 — `PILOTING_CYCLE`

Requiert `defaultGovernanceCycleId` configuré (settings client) et module **`governance_cycles`** activé pour le client.

**Si le cycle est actif** (statut hors `CLOSED` / `ARCHIVED`) au moment de l’approbation :

```text
status = APPROVED
routingTarget = PILOTING_CYCLE
routingStatus = ROUTED_TO_PILOTING_CYCLE
convertedProjectId = <project.id>   # projet brouillon créé pour la candidature
routedAt = now()
+ GovernanceCycleItem (sourceType PROJECT, decisionStatus CANDIDATE) sur le cycle configuré
```

**Si le cycle n’est pas actif** (ou module inactif) : demande `APPROVED`, `routingStatus = NOT_ROUTED` — pas de candidature forcée.

Audit complémentaire : `project_request.routed_to_piloting_cycle`.

#### Cas 2 — `DRAFT_PROJECT`

Effets :

```text
routingTarget = DRAFT_PROJECT
routingStatus = ROUTED_TO_DRAFT_PROJECT
convertedProjectId = <project.id>
status = CONVERTED_TO_PROJECT
routedAt = now()
```

Le projet créé reprend : `name` ← `title`, `description`, `estimatedCost` ← `estimatedBudget`, `status = DRAFT`.

#### Cas 3 — `PROJECT_BACKLOG`

Effets :

```text
routingTarget = PROJECT_BACKLOG
routingStatus = ROUTED_TO_PROJECT_BACKLOG
routedAt = now()
```

Aucun projet actif créé.

#### Cas 4 — `MANUAL_DECISION`

```text
status = APPROVED
routingTarget = MANUAL_DECISION
routingStatus = NOT_ROUTED
```

Routage via `POST …/route`.

---

### 6.6 Routage manuel

Si le workflow est en `MANUAL_DECISION`, un utilisateur autorisé peut choisir :

```text
PILOTING_CYCLE | DRAFT_PROJECT | PROJECT_BACKLOG
```

Autorisation : `authorizedRoutingUserIds` / `authorizedRoutingRoleIds` / permission `project_requests.route`.

---

### 6.7 Conversion en projet

Conditions :

* demande du client actif ;
* `status = APPROVED` (ou déjà en cours de routage `DRAFT_PROJECT` via route explicite) ;
* `convertedProjectId` null ;
* utilisateur autorisé à router/convertir ;
* destination `DRAFT_PROJECT`.

Transaction : créer projet → `convertedProjectId` → `CONVERTED_TO_PROJECT` → audit.

---

### 6.8 Annulation

Annulable si :

```text
DRAFT | NEEDS_MORE_INFO | SUBMITTED
```

Par le demandeur (non approuvée) ou `project_requests.update`.

Effet : `status = CANCELLED`.

`APPROVED` / `REJECTED` / `CONVERTED_TO_PROJECT` : annulation admin uniquement (`project_requests.update` + règle stricte optionnelle).

---

## 7. Permissions RBAC

```text
project_requests.read
project_requests.create
project_requests.update
project_requests.validate
project_requests.route
project_requests.settings.manage
```

| Permission | Usage |
| ---------- | ----- |
| `project_requests.read` | Voir les demandes |
| `project_requests.create` | Créer |
| `project_requests.update` | Modifier / administrer |
| `project_requests.validate` | Valider ; éligible comme validateur |
| `project_requests.route` | Router une demande approuvée |
| `project_requests.settings.manage` | Paramètres workflow client |

Seed : module catalogue **`project_requests`** (`Module.code = 'project_requests'`) — requis pour `ModuleAccessGuard` sur les routes `project_requests.*` (indépendant du module Nest `projects` et de la conversion projet).

---

## 8. API backend

Préfixe `/api`, headers `Authorization` + `X-Client-Id`, guards standards.

Réponses liste/détail : inclure `requesterSummary`, `validatorSummary`, `decidedBySummary`, `convertedProjectSummary` (`id`, `name`, `code`) pour l’UI.

### 8.1 Demandes projet

| Méthode | Route | Permission |
| ------- | ----- | ---------- |
| `GET` | `/api/project-requests` | `project_requests.read` |
| `POST` | `/api/project-requests` | `project_requests.create` |
| `GET` | `/api/project-requests/:id` | `project_requests.read` |
| `PATCH` | `/api/project-requests/:id` | `@RequireAnyPermissions('project_requests.create', 'project_requests.update')` + `@RequireWriteLicense()` ; demandeur si `DRAFT` / `NEEDS_MORE_INFO` ou admin |

Query liste : `status`, `validatorUserId`, `search`, `page`, `limit` (défaut 20). Filtre ACL post-query (MVP : pagination en mémoire sur IDs lisibles).

Isolation : `clientId` actif ; lecture hors périmètre → **404**. ACL type **`PROJECT_REQUEST`** via `AccessControlService` uniquement (pas AccessDecision V2). Licence : lecture `READ_ONLY` ou `READ_WRITE` ; mutations `READ_WRITE` + `@RequireWriteLicense()`.

Champs interdits en PATCH direct : `status`, `routingStatus`, `routingTarget`, `convertedProjectId`, `decidedByUserId`, `decidedAt`.

### 8.2 Actions workflow

| Méthode | Route | Notes |
| ------- | ----- | ----- |
| `POST` | `/api/project-requests/:id/submit` | `@RequireAnyPermissions('project_requests.create', 'project_requests.update')` + write licence |
| `POST` | `/api/project-requests/:id/decision` | `project_requests.validate` + write licence — **validateur désigné uniquement** — body `{ outcome: APPROVED \| REJECTED \| NEEDS_MORE_INFO, comment? }` |
| `POST` | `/api/project-requests/:id/route` | `project_requests.route` — body `{ target: PILOTING_CYCLE \| DRAFT_PROJECT \| PROJECT_BACKLOG }` |
| `POST` | `/api/project-requests/:id/cancel` | `@RequireAnyPermissions('project_requests.create', 'project_requests.update')` — body `{ comment? }` |

### 8.3 Paramètres workflow client

| Méthode | Route | Permission |
| ------- | ----- | ---------- |
| `GET` | `/api/clients/active/project-request-workflow-settings` | `settings.manage` ou `read` — `{ stored, resolved, options }` ; `options` inclut cycles éligibles et `pilotingCycleTargetAvailable` |
| `PATCH` | `/api/clients/active/project-request-workflow-settings` | **CLIENT_ADMIN** ou **PLATFORM_ADMIN** (`ClientAdminOrPlatformAdminGuard`) — body : `defaultApprovedTarget`, `defaultGovernanceCycleId`, listes validateurs/routeurs, etc. |

Réponse `{ stored, resolved }` — valider `userIds` / `roleIds` membres du client actif.

### 8.4 Validateurs disponibles

`GET /api/project-requests/validator-options` — permission `project_requests.create` — membres actifs filtrés + `project_requests.validate`.

---

## 9. Interface frontend

### 9.1 Pages

```text
/projects/requests
/projects/requests/new
/projects/requests/[id]
/client/administration/project-request-workflow
```

### 9.2 Liste

Colonnes : titre, demandeur, validateur, statut, urgence, budget estimé, destination, dates.

Filtres : statut, validateur, demandeur, destination, recherche.

### 9.3 Formulaire

Champs MVP + **enjeu métier** (`expectedBenefits` obligatoire UI, `businessContext`, `riskIfNotDone`, urgence, budget) ; création via **modale** depuis la liste (`CreateProjectRequestDialog`) ; route `/projects/requests/new` ouvre la même modale.

Validateur : combobox **nom affiché** (`displayName`), si `allowRequesterToSelectValidator` ; masqué si workflow client désactive le choix demandeur.

### 9.4 Détail

Informations, décision, destination, lien projet converti, timeline audit.

Actions conditionnelles par droits.

### 9.5 Paramètres workflow

Réservé **CLIENT_ADMIN** (page + PATCH API).

Sections livrées :

* **Cible après approbation** : `MANUAL_DECISION` | `DRAFT_PROJECT` | `PROJECT_BACKLOG` | `PILOTING_CYCLE` ;
* **Cycle de pilotage cible** (`defaultGovernanceCycleId`) — requis si `PILOTING_CYCLE` ; liste des cycles actifs (module `governance_cycles` activé) ;
* (partiel) mode sélection validateur, listes users/rôles validateurs et routeurs — backend prêt, UI admin listes : partiel.

---

## 10. Audit logs

```text
project_request.created
project_request.updated
project_request.submitted
project_request.decision          # outcome APPROVED | REJECTED | NEEDS_MORE_INFO
project_request.cancelled
project_request.routed
project_request.routed_to_piloting_cycle
project_request.converted_to_project
project_request.workflow_settings.updated
```

`resourceType = project_request`, `resourceId`, `clientId`, `userId`, `oldValue` / `newValue`, `requestId`.

Conversion : inclure `convertedProjectId` dans `newValue`.

---

## 11. Notifications

Livré (2026-06-09) — best-effort via socle **RFC-038** (`Notification` in-app + `EmailService.queueEmail`, template `generic_notification`) ; échec **ne bloque pas** la transition.

| Événement | Destinataire | Canaux |
|-----------|--------------|--------|
| Soumission (`SUBMITTED`) | Validateur désigné | Cloche + e-mail |
| Décision (`APPROVED` / `REJECTED` / `NEEDS_MORE_INFO`) | Demandeur | Cloche + e-mail |

`actionUrl` : `/projects/requests/:id`. Permission lecture notifications : `notifications.read` (cloche shell).

---

## 12. Intégration avec le cycle de pilotage

Livré (2026-06-09) pour le **pool candidatures** :

* Settings : `defaultGovernanceCycleId` + validation module/cycle actif ;
* À l’approbation ou routage manuel `PILOTING_CYCLE` : projet brouillon lié + `GovernanceCycleItem` `CANDIDATE` ;
* Cycle « actif pour pool » : statuts `DRAFT`, `PREPARING`, `TO_ARBITRATE`, `ARBITRATED`, `IN_EXECUTION` (exclut `CLOSED`, `ARCHIVED`).

**Hors scope** : rattachement automatique à une `GovernanceCycleInstance` / ODJ séance — voir RFC cycle instances.

---

## 13. Intégration avec le backlog projet

Backlog = demandes avec `routingTarget = PROJECT_BACKLOG`.

Vue : `/projects/requests?routingTarget=PROJECT_BACKLOG`.

---

## 14. Sécurité et multi-tenant

* `clientId` actif uniquement ;
* pas de `clientId` en body ;
* `404` hors client ;
* `ClientUser` actif ;
* RBAC sur chaque route.

---

## 15. Erreurs métier attendues

```text
PROJECT_REQUEST_NOT_FOUND
PROJECT_REQUEST_INVALID_STATUS_TRANSITION
PROJECT_REQUEST_VALIDATOR_REQUIRED
PROJECT_REQUEST_VALIDATOR_NOT_ALLOWED
PROJECT_REQUEST_ALREADY_CONVERTED
PROJECT_REQUEST_ROUTING_NOT_ALLOWED
PROJECT_REQUEST_WORKFLOW_SETTINGS_INVALID
PROJECT_REQUEST_CANNOT_EDIT_SUBMITTED
PROJECT_REQUEST_CANNOT_CANCEL_FINALIZED
```

Implémentation : `BadRequestException` / `ForbiddenException` avec code stable dans le payload erreur API existant.

---

## 16. Critères d’acceptation

### Backend

* [ ] Création brouillon
* [ ] Soumission sans validateur autorisé → erreur
* [ ] Validateur non autorisé non sélectionnable
* [ ] Demandeur ne modifie plus après soumission (sauf `NEEDS_MORE_INFO`)
* [ ] Validateur : approve / reject / more info
* [ ] Approbation applique workflow client
* [ ] `DRAFT_PROJECT` crée projet + `convertedProjectId`
* [ ] Pas de double conversion
* [ ] `PROJECT_BACKLOG` sans projet
* [ ] `PILOTING_CYCLE` : candidature cycle + projet brouillon lié si cycle actif ; sinon attente
* [ ] Settings client GET/PATCH
* [ ] Audits sensibles
* [ ] Isolation multi-tenant (tests e2e)

### Frontend

* [ ] CRUD demande + validateur libellé
* [ ] Soumission demandeur
* [ ] File validateur
* [ ] Décisions validateur
* [ ] Admin workflow
* [ ] Liste statuts/destinations
* [ ] Lien projet converti

---

## 17. Tests à prévoir

### Unitaires backend

* DTO create/update ;
* transitions statut ;
* résolution validateurs ;
* application workflow ;
* conversion transactionnelle ;
* double conversion interdite.

### e2e backend

* create → submit → approve → route backlog ;
* approve + auto `DRAFT_PROJECT` ;
* cross-client 404 ;
* validateur non autorisé.

### Frontend

* formulaire, liste, droits, page settings.

---

## 18. Décisions structurantes

* Demande ≠ `Project`.
* Pas de création projet directe par le demandeur.
* Validateur manuel MVP.
* Workflow client post-approbation.
* Statut demande ≠ destination.
* Cycle : pool candidatures `GovernanceCycleItem` si module + cycle actifs ; sinon attente.
* Backlog = vue filtrée.
* Conversion transactionnelle.

---

## 19. Roadmap future

* validation multi-niveaux ;
* règles par montant / type ;
* lien cycle complet ;
* scoring / doublons ;
* notifications avancées ;
* dashboard demandes ;
* lien budget prévisionnel.

---

## 20. Résumé fonctionnel

Couche amont au module Projets : formulation, validation, routage configurable. Le projet n’existe que si le workflow ou le routage l’exige explicitement.

---

# Partie III — Livraison

## III.1 Plan d’implémentation (lots — livré MVP 2026-06-03)

| Lot | Contenu | Statut |
| --- | ------- | ------ |
| **INTAKE-A** | Prisma + migration `20260603120000_*` + seed `project_requests` + ACL `PROJECT_REQUEST` | ✅ |
| **INTAKE-B/C/E** | Module `project-requests` (CRUD, workflow, conversion, validator-options) | ✅ |
| **INTAKE-D** | Settings client GET/PATCH | ✅ |
| **INTAKE-F/G** | UI `/projects/requests`, admin workflow, navigation | ✅ MVP (filtres liste / admin listes users-rôles : partiels) |
| **INTAKE-H** | Notifications RFC-038, pool cycle pilotage, `defaultGovernanceCycleId`, décision validateur strict, modale création, PATCH settings CLIENT_ADMIN | ✅ 2026-06-09 |

**Hors MVP / partiel** : UI routage manuelle complète ; admin listes users/rôles validateurs en UI ; AccessDecision V2 sur `PROJECT_REQUEST` ; pagination SQL post-filtre ACL ; rattachement instance cycle (ODJ séance).

**Livré post-MVP (2026-06-09)** : notifications §11 ; pool cycle `GovernanceCycleItem` ; paramétrage CLIENT_ADMIN + `defaultGovernanceCycleId` ; décision validateur strict ; modale création enrichie.

---

## III.2 Récapitulatif final

| Élément | Décision |
| ------- | -------- |
| Entités | `ProjectRequest`, `ProjectRequestWorkflowSettings` |
| API | `/api/project-requests/*`, `/api/clients/active/project-request-workflow-settings` |
| Permissions | 6 codes `project_requests.*` ; module catalogue `project_requests` |
| ACL | `PROJECT_REQUEST` ; policy **DEFAULT** à la création ; ACL auto WRITE demandeur/validateur (`ProjectRequestAutoAclGrant`) |
| Projet créé | `DRAFT_PROJECT` (auto ou route) ; aussi projet brouillon **lié** pour `PILOTING_CYCLE` (statut demande reste `APPROVED`) |
| Cycle | Pool `GovernanceCycleItem` CANDIDATE si module + cycle actifs ; sinon attente |
| Settings PATCH | **CLIENT_ADMIN** / platform admin |
| UI | Liste + modale création ; admin workflow (cible + cycle) |

---

## III.3 Points de vigilance

1. **Ne jamais** accepter `clientId` en body ; toujours filtrer par client actif.
2. **Conversion projet** : respecter `ProjectsService.create` (code, type, ownership) — documenter les défauts dans la PR INTAKE-E.
3. **Distinction** `APPROVED` vs `CONVERTED_TO_PROJECT` : une demande peut être approuvée mais en backlog ou cycle sans projet.
4. **UI** : validateur, demandeur, projet converti en **libellés** ; IDs uniquement en valeur technique des selects.
5. **Concurrence** : verrouiller conversion (check `convertedProjectId` dans la transaction).
6. **Cycles** : candidature via service interne `ProjectRequestPilotingCycleRoutingService` (pas d’appel HTTP `POST candidacies` depuis le demandeur) ; vérifier module `governance_cycles` + statut cycle avant pool.
7. **Permissions** : seul le **validateur désigné** décide ; `project_requests.validate` requis sur la route decision.
8. **Admin selects** : charger users/rôles du client avec libellés (`displayName`, `role.name`), pas listes d’UUID nues.
