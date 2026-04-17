# RFC-PROJ-SC-001 — Project Scenario Core

## Statut

🟢 Implémenté (backend MVP)

## Priorité

Très haute

## Dépendances

- `RFC-PROJ-001` — cadrage module Projets
- `RFC-PROJ-010` — `Project ↔ Budget Integration`
- `RFC-PROJ-011` / `RFC-PROJ-012` — tâches, jalons, planning existants
- `RFC-PROJ-013` — points projet / historisation
- `RFC-PROJ-018` — risques projet MVP
- `RFC-013` — audit logs

## Implémentation (référence repo)

| Élément | Détail |
| ------- | ------ |
| **Prisma** | `apps/api/prisma/schema.prisma` — enum `ProjectScenarioStatus`, modèle `ProjectScenario`, relations `Client` / `Project` / `User` (`selectedByUserId`, `archivedByUserId`) |
| **Migration** | `apps/api/prisma/migrations/20260419140000_project_scenarios_core/migration.sql` |
| **Contrainte baseline** | index unique partiel PostgreSQL `UNIQUE (projectId) WHERE status = 'SELECTED'` |
| **Module NestJS** | `apps/api/src/modules/project-scenarios/` |
| **Routes** | `GET|POST /api/projects/:projectId/scenarios`, `GET|PATCH /api/projects/:projectId/scenarios/:scenarioId`, `POST .../duplicate`, `POST .../select`, `POST .../archive` |
| **Permissions** | lecture `projects.read`, écriture `projects.update` |
| **Guards** | `JwtAuthGuard`, `ActiveClientGuard`, `ModuleAccessGuard`, `PermissionsGuard` |
| **Audit** | `project.scenario.created`, `project.scenario.updated`, `project.scenario.duplicated`, `project.scenario.selected`, `project.scenario.archived` |
| **Tests** | `apps/api/src/modules/project-scenarios/project-scenarios.service.spec.ts`, `apps/api/src/modules/project-scenarios/project-scenarios.controller.spec.ts` |

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

  client            Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  selectedByUser    User?    @relation("ProjectScenarioSelectedBy", fields: [selectedByUserId], references: [id], onDelete: SetNull)
  archivedByUser    User?    @relation("ProjectScenarioArchivedBy", fields: [archivedByUserId], references: [id], onDelete: SetNull)

  @@index([clientId, projectId])
  @@index([clientId, projectId, status])
  @@index([projectId, version])
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
- `status` est la source de vérité métier
- `isBaseline = true` uniquement sur le scénario sélectionné
- la garantie est portée par le service **et** par la base de données via un index unique partiel PostgreSQL sur `status = 'SELECTED'`

## 6.3 Duplication

La duplication MVP crée un nouveau scénario `DRAFT` avec copie de :

- hypothèses
- libellés et description

Mais jamais :

- les audits
- les métadonnées de sélection / archivage
- les sous-ressources futures des RFC `SC-002` à `SC-006`

La `version` est calculée de manière monotone par projet : `MAX(version) + 1`, y compris si des scénarios plus anciens sont archivés.

## 6.4 Archivage

- un scénario `SELECTED` ne peut pas être archivé directement
- pour sortir d’un baseline actif, il faut d’abord sélectionner un autre scénario
- la sélection archive automatiquement les autres scénarios du projet

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

Règle MVP :

- `POST /select` est autorisé à tout moment pour un projet accessible dans le scope client
- il ne déclenche pas encore le workflow futur `PLANNED / IN_PROGRESS` de `RFC-PROJ-SC-007`

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
  "code": null,
  "status": "DRAFT",
  "version": 3,
  "isBaseline": false,
  "description": "Hypothèse courte",
  "assumptionSummary": "Déploiement sur 2 vagues",
  "selectedAt": null,
  "selectedByUserId": null,
  "archivedAt": null,
  "archivedByUserId": null,
  "budgetSummary": null,
  "resourceSummary": null,
  "timelineSummary": null,
  "riskSummary": null
}
```

Le comportement des résumés a évolué avec les RFC suivantes :

- `budgetSummary` est `null` sur la **liste** et alimenté sur le **détail** scénario (`RFC-PROJ-SC-002`).
- `resourceSummary` est `null` sur la **liste** et alimenté sur le **détail** scénario (`RFC-PROJ-SC-003`).
- `timelineSummary` est `null` sur la **liste** mais alimenté sur le **détail** scénario (`RFC-PROJ-SC-004`).
- `riskSummary` reste `null` sur la **liste** mais est alimenté sur le **détail** scénario (`RFC-PROJ-SC-006` backend MVP).

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
- resynchronisation `status -> isBaseline`
- archivage automatique des variantes non retenues
- duplication sans fuite de données de sélection
- monotonie de `version`
- mapping d’erreur de concurrence sur la contrainte d’unicité `SELECTED`

## Intégration

- sélection d’un scénario depuis un projet multi-scénarios
- lecture du résumé minimal

---

# 11. Plan d’implémentation

1. Ajouter Prisma `ProjectScenario` + migration + index unique partiel `SELECTED`.
2. Créer module NestJS `project-scenarios`.
3. Exposer CRUD minimal + duplication légère.
4. Ajouter sélection transactionnelle + archivage automatique des autres scénarios.
5. Ajouter audit logs.
6. Exposer résumé minimal stable pour la future UI.

---

# 12. Points de vigilance

- transaction obligatoire sur `select` pour compléter la contrainte DB d’unicité baseline
- ne pas coupler le socle scénario à un moteur financier trop tôt
- conserver le scope `clientId` sur tous les agrégats
- ne jamais exposer d’IDs bruts comme libellés côté frontend
- mapper proprement la concurrence sur l’unicité `SELECTED` en erreur API maîtrisée
