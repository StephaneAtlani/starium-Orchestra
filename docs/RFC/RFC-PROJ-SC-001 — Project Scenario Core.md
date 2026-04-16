# RFC-PROJ-SC-001 — Project Scenario Core

## Statut

📝 Draft

## Priorité

Très haute

## Dépendances

- `RFC-PROJ-001` — cadrage module Projets
- `RFC-PROJ-010` — `Project ↔ Budget Integration`
- `RFC-PROJ-011` / `RFC-PROJ-012` — tâches, jalons, planning existants
- `RFC-PROJ-013` — points projet / historisation
- `RFC-PROJ-018` — risques projet MVP
- `RFC-013` — audit logs

---

# 1. Objectif

Introduire un **socle de scénarios projet** permettant de modéliser plusieurs variantes d’un même projet avant engagement, avec :

- un scénario `DRAFT` ou `SELECTED`
- une baseline unique retenue pour l’exécution
- un archivage des variantes non retenues
- une traçabilité complète de la décision

Le scénario devient l’objet pivot des projections coût / charge / délai / risque.

---

# 2. Problème adressé

Aujourd’hui, Starium sait suivre un projet en cours, mais pas comparer proprement plusieurs hypothèses avant décision.

Conséquences :

- pas de simulation multi-options
- pas de baseline de référence unique
- pas d’historique de décision exploitable
- comparaison `prévu vs réel` incomplète

---

# 3. Périmètre

## Inclus

- entité `ProjectScenario`
- duplication d’un scénario
- sélection d’un scénario actif
- archivage logique des autres scénarios non retenus
- indicateurs de synthèse d’un scénario
- audit des créations / duplications / sélections / archivages

## Exclus

- moteur financier détaillé par ligne
- moteur charge / capacité
- gantt dédié scénario
- modélisation détaillée des risques

Ces points sont couverts par les RFC `SC-002` à `SC-006`.

---

# 4. Concepts métier

## 4.1 Règles cardinales

- un `Project` peut avoir plusieurs scénarios
- un seul scénario peut être `SELECTED` à un instant donné
- un scénario archivé n’est plus éditable
- le scénario sélectionné devient la **baseline projet**

## 4.2 Statuts

```text
DRAFT
SELECTED
ARCHIVED
```

## 4.3 Types usuels

Exemples de scénarios :

- MVP
- ambitieux
- contraint budget
- contraint capacité
- étalé dans le temps

Le type reste libre via `label`, pas via enum rigide au MVP.

---

# 5. Modèle de données

## 5.1 Nouveau modèle

```prisma
model ProjectScenario {
  id                String   @id @default(cuid())
  clientId          String
  projectId         String

  name              String
  code              String?
  description       String?
  assumptionSummary String?
  status            ProjectScenarioStatus @default(DRAFT)
  version           Int      @default(1)
  isBaseline        Boolean  @default(false)
  selectedAt        DateTime?
  selectedByUserId  String?
  archivedAt        DateTime?
  archivedByUserId  String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([clientId, projectId])
  @@index([clientId, projectId, status])
  @@unique([projectId, code])
}
```

## 5.2 Enum

```prisma
enum ProjectScenarioStatus {
  DRAFT
  SELECTED
  ARCHIVED
}
```

---

# 6. Règles métier

## 6.1 Scope client

- `ProjectScenario.clientId == Project.clientId`
- toutes les requêtes sont filtrées par client actif

## 6.2 Unicité baseline

- un seul scénario `SELECTED` par projet
- `isBaseline = true` uniquement sur le scénario sélectionné

## 6.3 Duplication

La duplication crée un nouveau scénario `DRAFT` avec copie de :

- hypothèses
- paramètres financiers synthétiques
- structure planning si présente
- projections de risques si présentes

Mais jamais les audits ni métadonnées de sélection.

## 6.4 Archivage

- un scénario `SELECTED` ne peut pas être archivé directement
- l’archivage des autres scénarios est automatique lors de la sélection, sauf demande explicite de conservation en `DRAFT`

---

# 7. API backend

Module recommandé :

```text
apps/api/src/modules/project-scenarios/
```

## 7.1 Endpoints

```http
GET    /api/projects/:projectId/scenarios
POST   /api/projects/:projectId/scenarios
POST   /api/projects/:projectId/scenarios/:scenarioId/duplicate
GET    /api/projects/:projectId/scenarios/:scenarioId
PATCH  /api/projects/:projectId/scenarios/:scenarioId
POST   /api/projects/:projectId/scenarios/:scenarioId/select
POST   /api/projects/:projectId/scenarios/:scenarioId/archive
```

## 7.2 Permissions

- `projects.read` pour lecture
- `projects.update` pour création / duplication / sélection / archivage

## 7.3 Guards

```text
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

---

# 8. Réponses API minimales

Chaque scénario doit exposer un résumé directement exploitable côté UI :

```json
{
  "id": "sc_x",
  "name": "Option ambitieuse",
  "status": "DRAFT",
  "isBaseline": false,
  "assumptionSummary": "Déploiement sur 2 vagues",
  "budgetSummary": {
    "plannedAmount": 120000,
    "forecastAmount": 138000,
    "varianceAmount": 18000
  },
  "resourceSummary": {
    "plannedDays": 180,
    "plannedFte": 2.4
  },
  "timelineSummary": {
    "plannedStartDate": "2026-09-01",
    "plannedEndDate": "2027-01-31"
  },
  "riskSummary": {
    "criticalCount": 2,
    "score": 18
  }
}
```

---

# 9. Audit logs

Événements recommandés :

```text
project.scenario.created
project.scenario.updated
project.scenario.duplicated
project.scenario.selected
project.scenario.archived
```

Payload minimal :

- `projectId`
- `scenarioId`
- `clientId`
- `previousSelectedScenarioId` si applicable

---

# 10. Tests

## Backend

- création scénario dans le bon `clientId`
- refus d’accès inter-client
- unicité du scénario sélectionné
- archivage automatique des variantes non retenues
- duplication sans fuite de données de sélection

## Intégration

- sélection d’un scénario depuis un projet multi-scénarios
- lecture du résumé consolidé

---

# 11. Plan d’implémentation

1. Ajouter Prisma `ProjectScenario` + migration + index.
2. Créer module NestJS `project-scenarios`.
3. Exposer CRUD minimal + duplication.
4. Ajouter workflow de sélection avec transaction atomique.
5. Ajouter audit logs.
6. Exposer résumé consolidé pour la future UI.

---

# 12. Points de vigilance

- transaction obligatoire sur `select` pour garantir l’unicité baseline
- ne pas coupler le socle scénario à un moteur financier trop tôt
- conserver le scope `clientId` sur tous les agrégats
- ne jamais exposer d’IDs bruts comme libellés côté frontend
