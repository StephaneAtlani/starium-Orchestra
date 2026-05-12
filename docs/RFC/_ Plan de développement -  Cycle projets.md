Voici un **plan de développement backend + frontend** pour intégrer le module **Cycles de pilotage** dans Starium Orchestra, sans casser les modules existants.

Le principe reste aligné avec ton architecture actuelle : **backend source de vérité**, routes API préfixées `/api`, isolation par `X-Client-Id`, guards standards, frontend feature-first, et aucune logique métier critique côté React. 

# Plan de développement — Cycles de pilotage

## Objectif du module

Créer une couche de gouvernance permettant d’arbitrer :

```text
Projets
Objectifs stratégiques
Budgets
Risques
Capacité
Décisions CODIR
```

sans modifier le cycle de vie du module Projets.

La séparation doit rester nette :

```text
Cycle de pilotage = arbitrage / priorisation / décision
Projet = exécution / tâches / planning / risques / budget
```

---

# 1. Développement backend

## Lot Backend 1 — Modèle de données Prisma

### Fichier à modifier

```text
apps/api/prisma/schema.prisma
```

### Modèles à créer

```prisma
model GovernanceCycle {
  id              String   @id @default(cuid())
  clientId        String

  name            String
  code            String?
  description     String?

  cadence         GovernanceCycleCadence
  status          GovernanceCycleStatus

  startDate       DateTime?
  endDate         DateTime?

  sponsorLabel    String?
  objectiveSummary String?
  decisionSummary  String?

  createdByUserId   String?
  validatedByUserId String?
  validatedAt       DateTime?
  closedAt          DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  items GovernanceCycleItem[]

  @@index([clientId])
  @@index([clientId, status])
  @@index([clientId, cadence])
}

model GovernanceCycleItem {
  id              String @id @default(cuid())
  clientId        String
  cycleId         String

  sourceType      GovernanceCycleItemSourceType

  projectId       String?
  strategicObjectiveId String?
  budgetId        String?
  budgetLineId    String?
  riskId          String?

  title           String
  description     String?

  decisionStatus  GovernanceCycleItemDecisionStatus
  decisionReason  String?

  valueScore      Int?
  riskScore       Int?
  budgetScore     Int?
  capacityScore   Int?
  alignmentScore  Int?
  priorityScore   Int?

  estimatedBudgetAmount Decimal?
  estimatedCapacityDays  Decimal?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  cycle GovernanceCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([cycleId])
  @@index([projectId])
  @@index([strategicObjectiveId])
  @@index([budgetId])
  @@index([riskId])
}
```

### Enums à ajouter

```prisma
enum GovernanceCycleCadence {
  MONTHLY
  QUARTERLY
  SEMESTERLY
  YEARLY
  ONE_SHOT
  CONTINUOUS
  CUSTOM
}

enum GovernanceCycleStatus {
  DRAFT
  PREPARING
  TO_ARBITRATE
  ARBITRATED
  IN_EXECUTION
  CLOSED
  ARCHIVED
}

enum GovernanceCycleItemSourceType {
  PROJECT
  STRATEGIC_OBJECTIVE
  BUDGET
  BUDGET_LINE
  RISK
  MANUAL
}

enum GovernanceCycleItemDecisionStatus {
  CANDIDATE
  TO_ARBITRATE
  ACCEPTED
  DEFERRED
  REJECTED
  NEEDS_INFORMATION
  ACCEPTED_WITH_RESERVE
}
```

---

## Lot Backend 2 — Module NestJS

### Dossier à créer

```text
apps/api/src/modules/governance-cycles/
```

### Fichiers

```text
governance-cycles.module.ts
governance-cycles.controller.ts
governance-cycles.service.ts

dto/
├── create-governance-cycle.dto.ts
├── update-governance-cycle.dto.ts
├── create-governance-cycle-item.dto.ts
├── update-governance-cycle-item.dto.ts
├── list-governance-cycles-query.dto.ts
└── list-governance-cycle-items-query.dto.ts
```

### Module à enregistrer

```text
apps/api/src/app.module.ts
```

Ajouter :

```ts
GovernanceCyclesModule
```

---

## Lot Backend 3 — RBAC et activation module

Créer un nouveau module RBAC :

```text
governance_cycles
```

Permissions :

```text
governance_cycles.read
governance_cycles.create
governance_cycles.update
governance_cycles.delete
governance_cycles.arbitrate
```

À ajouter dans le seed Prisma :

```text
apps/api/prisma/seed.ts
```

Le module doit respecter le pipeline standard :

```text
JwtAuthGuard
→ ActiveClientGuard
→ ModuleAccessGuard
→ PermissionsGuard
```

C’est cohérent avec les conventions déjà utilisées sur les routes métier client-scopées. 

---

## Lot Backend 4 — CRUD Cycles de pilotage

### Endpoints à créer

```text
GET    /api/governance-cycles
POST   /api/governance-cycles
GET    /api/governance-cycles/:id
PATCH  /api/governance-cycles/:id
DELETE /api/governance-cycles/:id
```

### Règles métier

```text
GET = governance_cycles.read
POST = governance_cycles.create
PATCH = governance_cycles.update
DELETE = governance_cycles.delete
```

Le `DELETE` ne supprime pas physiquement.

Il fait :

```text
status = ARCHIVED
```

Règles :

```text
- toutes les requêtes filtrent par clientId
- aucun clientId dans les DTO
- clientId toujours dérivé du client actif
- impossible de modifier un cycle ARCHIVED
- impossible de clôturer un cycle vide
- impossible de valider un cycle avec des items encore CANDIDATE
```

---

## Lot Backend 5 — Items du cycle

### Endpoints

```text
GET    /api/governance-cycles/:cycleId/items
POST   /api/governance-cycles/:cycleId/items
GET    /api/governance-cycles/:cycleId/items/:itemId
PATCH  /api/governance-cycles/:cycleId/items/:itemId
DELETE /api/governance-cycles/:cycleId/items/:itemId
```

### Règle fondamentale

Un item peut pointer vers un projet, un budget ou un risque, mais **ne modifie jamais directement l’objet source**.

Exemple :

```text
Project.status reste inchangé
GovernanceCycleItem.decisionStatus porte l’arbitrage
```

Le module Projets conserve donc son fonctionnement existant : projets, tâches, Gantt, risques, scénarios, documents, revues et liens budgétaires. 

---

## Lot Backend 6 — Validation des objets liés

Quand un item référence une entité existante, le backend doit vérifier son appartenance au client actif.

### À contrôler

```text
projectId → Project.clientId
budgetId → Budget.clientId
budgetLineId → BudgetLine.clientId
riskId → Risk.clientId ou ProjectRisk via projet client
strategicObjectiveId → StrategicObjective.clientId
```

### Erreurs attendues

```text
404 si objet introuvable ou hors client
400 si sourceType incohérent avec les IDs fournis
409 si même projet déjà présent dans le même cycle
```

---

## Lot Backend 7 — Scoring d’arbitrage

### Calcul côté backend uniquement

```text
priorityScore =
(valueScore * 3)
+ (alignmentScore * 3)
+ (budgetScore * 2)
+ (capacityScore * 2)
- (riskScore * 2)
```

### Règles

```text
- scores optionnels
- si renseignés : entre 1 et 5
- priorityScore recalculé à chaque create/update d’item
- score null si les données nécessaires sont insuffisantes
```

Pas d’IA en V1. Le score doit rester explicable.

---

## Lot Backend 8 — Summary du cycle

### Endpoint

```text
GET /api/governance-cycles/:id/summary
```

### Réponse attendue

```ts
{
  cycleId: string;
  totalItems: number;
  acceptedCount: number;
  deferredCount: number;
  rejectedCount: number;
  toArbitrateCount: number;
  needsInformationCount: number;
  acceptedWithReserveCount: number;
  estimatedBudgetTotal: number;
  estimatedCapacityDaysTotal: number;
  averagePriorityScore: number | null;
  highRiskItemsCount: number;
  generatedAt: string;
}
```

Ce endpoint alimente les KPI frontend.

---

## Lot Backend 9 — Connexion avec le module Projets

### Endpoint recommandé

```text
GET /api/governance-cycles/by-project/:projectId
```

Objectif : afficher dans une fiche projet les cycles où le projet apparaît.

Exemple de réponse :

```ts
{
  items: [
    {
      cycleId: string;
      cycleName: string;
      cadence: string;
      periodLabel: string;
      decisionStatus: string;
      priorityScore: number | null;
    }
  ]
}
```

Ne pas créer d’endpoint dans `/api/projects/:projectId/governance-cycles` en V1, pour garder le module Cycles isolé.

---

## Lot Backend 10 — Audit logs

Actions à auditer :

```text
governance_cycle.created
governance_cycle.updated
governance_cycle.archived
governance_cycle.validated
governance_cycle.closed

governance_cycle_item.created
governance_cycle_item.updated
governance_cycle_item.deleted
governance_cycle_item.decision_changed
```

Les logs doivent rester scopés client, comme le reste des actions métier sensibles.

---

# 2. Développement frontend

## Lot Frontend 1 — Structure feature-first

### Routes à créer

```text
apps/web/src/app/(protected)/cycles/page.tsx
apps/web/src/app/(protected)/cycles/[cycleId]/page.tsx
```

### Feature à créer

```text
apps/web/src/features/governance-cycles/
```

Structure :

```text
api/
hooks/
components/
schemas/
types/
mappers/
utils/
constants/
```

Cette structure respecte l’approche frontend documentée : routes dans `app/`, logique métier UI par `features/`, composants partagés séparés, TanStack Query, Zod et backend source de vérité. 

---

## Lot Frontend 2 — Types et contrats API

### À créer

```text
features/governance-cycles/types/governance-cycle.types.ts
features/governance-cycles/schemas/governance-cycle.schemas.ts
features/governance-cycles/api/governance-cycles.api.ts
features/governance-cycles/hooks/use-governance-cycles.ts
```

### Query keys

```ts
governanceCyclesKeys = {
  all: (clientId: string) => ['governance-cycles', clientId],
  lists: (clientId: string) => ['governance-cycles', clientId, 'list'],
  list: (clientId: string, filters: object) => ['governance-cycles', clientId, 'list', filters],
  detail: (clientId: string, cycleId: string) => ['governance-cycles', clientId, 'detail', cycleId],
  items: (clientId: string, cycleId: string) => ['governance-cycles', clientId, 'items', cycleId],
  summary: (clientId: string, cycleId: string) => ['governance-cycles', clientId, 'summary', cycleId],
}
```

Les query keys doivent être tenant-aware avec `clientId`.

---

## Lot Frontend 3 — Entrée navigation

Ajouter l’entrée dans la sidebar :

```text
Gouvernance
├── Cycles de pilotage
├── Objectifs stratégiques
├── Risques
└── Décisions
```

Icône recommandée :

```text
RefreshCcw
Repeat
Orbit
CircleDot
```

Libellé UI :

```text
Cycles de pilotage
```

Route :

```text
/cycles
```

Permission d’affichage :

```text
governance_cycles.read
```

---

## Lot Frontend 4 — Page liste des cycles

### Route

```text
/cycles
```

### Contenu

```text
PageHeader
KPI row
Toolbar
Table des cycles
Pagination
```

### KPI de haut de page

```text
Cycles actifs
À arbitrer
En exécution
Clôturés
```

### Colonnes table

```text
Nom
Cadence
Période
Statut
Items
À arbitrer
Budget estimé
Capacité estimée
Dernière mise à jour
Actions
```

### Filtres

```text
Recherche
Statut
Cadence
Période
```

### Actions

```text
Créer un cycle
Ouvrir
Modifier
Archiver
```

---

## Lot Frontend 5 — Création / édition d’un cycle

### Composant

```text
governance-cycle-form-dialog.tsx
```

### Champs

```text
Nom
Code
Description
Cadence
Date de début
Date de fin
Sponsor
Objectif du cycle
```

### Cadences

```text
Mensuel
Trimestriel
Semestriel
Annuel
Ponctuel
Continu
Personnalisé
```

### Règles UI

```text
- si cadence = CONTINUOUS, dates optionnelles
- si cadence != CONTINUOUS, startDate et endDate recommandées
- ne pas afficher les enums brutes
- afficher des libellés métier français
```

---

## Lot Frontend 6 — Page détail cycle

### Route

```text
/cycles/[cycleId]
```

### Structure visuelle

```text
Breadcrumb
Titre cycle + badge statut
Métadonnées : période, cadence, sponsor, créateur
Actions
Tabs
```

### Onglets

```text
Vue d’ensemble
Matrice d’arbitrage
Projets candidats
Budget & capacité
Risques
Décisions
Documents
```

En V1, `Documents` peut rester placeholder si tu veux garder la cohérence UI.

---

## Lot Frontend 7 — Vue d’ensemble

### Composants

```text
cycle-summary-cards.tsx
cycle-decision-donut.tsx
cycle-details-panel.tsx
cycle-decision-history-card.tsx
```

### KPI

```text
Éléments retenus
Éléments différés
Éléments rejetés
À arbitrer
Budget estimé
Capacité estimée
Score moyen
Risques élevés
```

### Design Starium

Couleurs :

```text
Noir : #0B0B0B ou #1B1B1B
Blanc : #FFFFFF
Or : #DB9801
Gris clair : #F5F5F5
Bordures : #E5E7EB
```

Usage :

```text
- sidebar noire
- workspace blanc
- accent principal or
- badges décision avec fond léger
- boutons primaires or/noir selon contexte
```

---

## Lot Frontend 8 — Matrice d’arbitrage

### Composant principal

```text
governance-cycle-arbitration-table.tsx
```

### Colonnes

```text
Élément
Type
Valeur
Alignement
Budget
Capacité
Risque
Score
Décision
Motif
Actions
```

### Actions ligne

```text
Retenir
Différer
Refuser
Demander complément
Accepter sous réserve
Modifier scores
Supprimer du cycle
```

### Règle UX importante

Ne jamais afficher :

```text
projectId
budgetId
riskId
objectiveId
```

Afficher :

```text
nom projet
code projet
nom budget
libellé risque
nom objectif
```

---

## Lot Frontend 9 — Ajout d’items dans un cycle

### Composant

```text
add-cycle-item-dialog.tsx
```

### Sources disponibles V1

```text
Projet
Objectif stratégique
Budget
Ligne budgétaire
Risque
Élément manuel
```

### Fonctionnement

L’utilisateur choisit un type, puis recherche un objet existant.

Pour les projets :

```text
GET /api/projects?search=...
```

Pour les budgets :

```text
GET /api/budgets?search=...
```

Pour les risques : selon module existant ou placeholder si le référentiel global risque n’est pas encore finalisé.

### MVP recommandé

Commencer par :

```text
Projet
Budget
Élément manuel
```

Puis ajouter :

```text
Objectif stratégique
Risque
Ligne budgétaire
```

---

## Lot Frontend 10 — Connexion avec la fiche projet

Sur la fiche projet, ajouter un bloc simple :

```text
Présence dans les cycles de pilotage
```

Exemple :

```text
Cycle CODIR juin 2026 — Retenu
Cycle budget 2026 — Différé
Cycle transformation SI — À arbitrer
```

### Donnée consommée

```text
GET /api/governance-cycles/by-project/:projectId
```

### Règle

Ce bloc est en lecture seule en V1.

---

# 3. Ordre de développement recommandé

## Sprint 1 — Backend socle

```text
Prisma models
Migration
Enums
Module NestJS
RBAC seed
CRUD cycles
Tests isolation client
```

## Sprint 2 — Backend items + scoring

```text
CRUD items
Validation objets liés
Calcul priorityScore
Summary endpoint
Audit logs
Tests métier
```

## Sprint 3 — Frontend liste

```text
Route /cycles
Feature governance-cycles
API client
Hooks TanStack Query
Table cycles
Filtres
Création cycle
```

## Sprint 4 — Frontend détail

```text
Route /cycles/[cycleId]
Header détail
KPI summary
Tabs
Matrice d’arbitrage
Actions décision
```

## Sprint 5 — Connexions modules

```text
Ajout projets candidats
Ajout budgets
Bloc cycles dans fiche projet
Badges métier
Contrôle permissions UI
```

## Sprint 6 — Stabilisation

```text
Tests backend
Tests frontend
Correction UX
Gestion erreurs 401/403/404/409
Documentation API
Documentation module
```

---

# 4. Ce qu’il ne faut pas faire en V1

```text
Ne pas modifier Project.status
Ne pas créer un Gantt de cycle
Ne pas dupliquer les tâches projet
Ne pas créer un moteur BPM
Ne pas automatiser les décisions
Ne pas ajouter d’IA
Ne pas faire d’export PDF
Ne pas créer de workflow complexe
Ne pas mélanger arbitrage cycle et exécution projet
```

---

# 5. Prompt Cursor prêt à copier

```text
Tu dois implémenter le module “Cycles de pilotage” dans Starium Orchestra.

Objectif :
Créer une couche de gouvernance transverse permettant d’arbitrer des projets, budgets, risques, objectifs stratégiques et éléments manuels selon une cadence de pilotage, sans modifier le cycle de vie du module Projets existant.

Contraintes générales :
- Le backend reste source de vérité.
- Respecter l’architecture API-first existante.
- Respecter l’isolation multi-client stricte via X-Client-Id.
- Toutes les routes métier doivent utiliser les guards standards :
  JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard.
- Ne jamais accepter clientId dans les DTO.
- Le clientId doit toujours venir du client actif.
- Ne pas modifier Project.status pour porter une décision de cycle.
- Les décisions d’arbitrage doivent être portées par GovernanceCycleItem.decisionStatus.
- Le module Projets reste l’espace d’exécution.
- Le module Cycles de pilotage est l’espace d’arbitrage.
- Aucun ID brut ne doit être affiché seul côté frontend.

Backend à créer :
- apps/api/src/modules/governance-cycles/
- governance-cycles.module.ts
- governance-cycles.controller.ts
- governance-cycles.service.ts
- dto/create-governance-cycle.dto.ts
- dto/update-governance-cycle.dto.ts
- dto/create-governance-cycle-item.dto.ts
- dto/update-governance-cycle-item.dto.ts
- dto/list-governance-cycles-query.dto.ts
- dto/list-governance-cycle-items-query.dto.ts

Prisma :
Créer les modèles GovernanceCycle et GovernanceCycleItem.
Créer les enums :
- GovernanceCycleCadence
- GovernanceCycleStatus
- GovernanceCycleItemSourceType
- GovernanceCycleItemDecisionStatus

RBAC :
Créer le module governance_cycles avec les permissions :
- governance_cycles.read
- governance_cycles.create
- governance_cycles.update
- governance_cycles.delete
- governance_cycles.arbitrate

Endpoints backend :
- GET /api/governance-cycles
- POST /api/governance-cycles
- GET /api/governance-cycles/:id
- PATCH /api/governance-cycles/:id
- DELETE /api/governance-cycles/:id avec archivage logique
- GET /api/governance-cycles/:cycleId/items
- POST /api/governance-cycles/:cycleId/items
- GET /api/governance-cycles/:cycleId/items/:itemId
- PATCH /api/governance-cycles/:cycleId/items/:itemId
- DELETE /api/governance-cycles/:cycleId/items/:itemId
- GET /api/governance-cycles/:id/summary
- GET /api/governance-cycles/by-project/:projectId

Règles métier :
- Impossible de modifier un cycle ARCHIVED.
- DELETE cycle = status ARCHIVED.
- Impossible d’ajouter dans un cycle un projet, budget, risque ou objectif hors client actif.
- Impossible d’ajouter deux fois le même projet dans le même cycle.
- Les scores valueScore, riskScore, budgetScore, capacityScore, alignmentScore sont optionnels mais doivent être entre 1 et 5 si présents.
- priorityScore doit être calculé côté backend avec la formule :
  (valueScore * 3)
  + (alignmentScore * 3)
  + (budgetScore * 2)
  + (capacityScore * 2)
  - (riskScore * 2)
- Les montants estimés et capacités estimées restent optionnels en V1.

Frontend à créer :
- apps/web/src/app/(protected)/cycles/page.tsx
- apps/web/src/app/(protected)/cycles/[cycleId]/page.tsx
- apps/web/src/features/governance-cycles/

Structure frontend :
- api/
- hooks/
- components/
- schemas/
- types/
- mappers/
- utils/
- constants/

Écrans frontend :
1. Page liste /cycles :
   - KPI cycles actifs, à arbitrer, en exécution, clôturés
   - table avec nom, cadence, période, statut, items, à arbitrer, budget estimé, capacité estimée, dernière mise à jour
   - filtres recherche, statut, cadence
   - action créer un cycle

2. Page détail /cycles/[cycleId] :
   - header avec titre, statut, période, cadence, sponsor
   - KPI summary
   - onglets : Vue d’ensemble, Matrice d’arbitrage, Projets candidats, Budget & capacité, Risques, Décisions, Documents

3. Matrice d’arbitrage :
   - élément, type, valeur, alignement, budget, capacité, risque, score, décision, motif
   - actions : retenir, différer, refuser, demander complément, accepter sous réserve

Design :
- Utiliser les couleurs Starium :
  noir #0B0B0B ou #1B1B1B
  blanc #FFFFFF
  or #DB9801
- Sidebar noire.
- Workspace blanc.
- Accent principal or.
- Badges décision lisibles.
- Aucun enum brut affiché dans l’UI.

Tests attendus :
- création cycle avec client actif
- refus sans client actif
- refus permission absente
- refus module désactivé
- isolation client stricte
- ajout projet hors client interdit
- doublon projet dans cycle interdit
- calcul priorityScore correct
- archivage logique correct
- summary correct
- query keys frontend avec clientId
- états loading, error, empty, success
- aucun ID brut affiché dans l’UI

Ne pas implémenter en V1 :
- pas de Gantt spécifique au cycle
- pas de duplication des tâches projet
- pas de moteur BPM
- pas d’IA
- pas d’export PDF
- pas de modification automatique des statuts projet
```

Ma recommandation : développe d’abord **backend lots 1 à 8**, puis seulement ensuite l’interface. Sinon tu risques de mettre trop de logique d’arbitrage dans React.
