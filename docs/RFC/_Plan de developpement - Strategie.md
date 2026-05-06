Voici le **plan de développement texte — Module Vision stratégique** pour Starium Orchestra.

Le module doit rester aligné avec l’architecture actuelle : routes API préfixées `/api`, isolation par `X-Client-Id`, guards standards `JwtAuthGuard → ActiveClientGuard → ModuleAccessGuard → PermissionsGuard`, backend source de vérité, frontend feature-first, et aucun calcul métier critique côté React. 

# Plan de développement — Vision stratégique

## 1. Objectif du module

Le module **Vision stratégique** sert à structurer le cap de l’entreprise ou de la DSI.

Il doit permettre de gérer :

```text
Vision
→ Axes stratégiques
→ Objectifs stratégiques
→ Liens d’alignement
→ KPI
→ Alertes de désalignement
```

Le module ne doit pas remplacer :

```text
Projets
Budgets
Risques
Cycles de pilotage
Schéma directeur
```

Il doit servir de **couche d’alignement** au-dessus de ces modules.

---

# 2. Périmètre V1

## Inclus en V1

```text
Créer / modifier une vision stratégique
Créer / modifier des axes stratégiques
Créer / modifier des objectifs stratégiques
Relier des objectifs à des axes
Calculer des KPI d’alignement
Afficher les alertes de désalignement
Afficher un cockpit stratégique
Historiser les actions sensibles via audit logs
```

## Hors périmètre V1

```text
Pas d’IA de recommandation
Pas de génération automatique de stratégie
Pas de workflow complexe d’approbation
Pas d’export PDF avancé
Pas de schéma directeur complet
Pas de modification automatique des projets
Pas d’arbitrage automatique CODIR
```

---

# 3. Modèle métier cible

## Chaînage fonctionnel

```text
Vision stratégique
   ↓
Axes stratégiques
   ↓
Objectifs stratégiques
   ↓
Alignement projets / budgets / risques
   ↓
KPI et alertes
```

## Rôle de chaque objet

| Objet                | Rôle                                                           |
| -------------------- | -------------------------------------------------------------- |
| Vision stratégique   | Définir le cap global                                          |
| Axe stratégique      | Structurer les grandes priorités                               |
| Objectif stratégique | Décliner les résultats attendus                                |
| Lien stratégique     | Relier un objectif à un projet, budget, risque ou autre entité |
| KPI                  | Mesurer l’alignement                                           |
| Alerte               | Identifier les écarts ou désalignements                        |

---

# 4. Développement backend

## Lot Backend 1 — Vérification du socle existant

Avant de développer, Cursor doit vérifier l’existant dans :

```text
apps/api/prisma/schema.prisma
apps/api/src/modules/strategic-vision/
apps/web/src/features/strategic-vision/
apps/web/src/app/(protected)/strategic-vision/
```

Vérifier si les modèles existent déjà :

```text
StrategicVision
StrategicAxis
StrategicObjective
StrategicLink
```

Ne pas recréer un modèle déjà existant.
Si les modèles existent, compléter uniquement les champs ou relations manquantes.

---

## Lot Backend 2 — Modèles Prisma

### Modèle StrategicVision

Champs attendus :

```text
id
clientId
title
description
horizonLabel
visionStatement
status
startDate
endDate
createdByUserId
validatedByUserId
validatedAt
createdAt
updatedAt
```

Statuts recommandés :

```text
DRAFT
ACTIVE
ARCHIVED
```

---

### Modèle StrategicAxis

Champs attendus :

```text
id
clientId
visionId
title
description
code
sortOrder
status
createdAt
updatedAt
```

Statuts :

```text
ACTIVE
INACTIVE
ARCHIVED
```

---

### Modèle StrategicObjective

Champs attendus :

```text
id
clientId
axisId
title
description
ownerUserId
targetDate
status
progressPercent
healthStatus
createdAt
updatedAt
```

Statuts :

```text
DRAFT
ACTIVE
COMPLETED
ARCHIVED
```

Health status :

```text
ON_TRACK
AT_RISK
OFF_TRACK
```

---

### Modèle StrategicLink

Objectif : relier la vision stratégique à d’autres objets Starium.

Champs attendus :

```text
id
clientId
objectiveId
targetType
targetId
alignmentScore
comment
createdAt
updatedAt
```

TargetType recommandé :

```text
PROJECT
BUDGET
BUDGET_LINE
RISK
GOVERNANCE_CYCLE
MANUAL
```

Règle importante :

```text
StrategicLink ne modifie jamais l’objet cible.
Il sert uniquement à mesurer et documenter l’alignement.
```

---

## Lot Backend 3 — Module NestJS

Dossier cible :

```text
apps/api/src/modules/strategic-vision/
```

Structure attendue :

```text
strategic-vision.module.ts
strategic-vision.controller.ts
strategic-vision.service.ts

dto/
├── create-strategic-vision.dto.ts
├── update-strategic-vision.dto.ts
├── create-strategic-axis.dto.ts
├── update-strategic-axis.dto.ts
├── create-strategic-objective.dto.ts
├── update-strategic-objective.dto.ts
├── create-strategic-link.dto.ts
├── update-strategic-link.dto.ts
└── list-strategic-vision-query.dto.ts
```

---

## Lot Backend 4 — RBAC

Module RBAC :

```text
strategic_vision
```

Permissions :

```text
strategic_vision.read
strategic_vision.create
strategic_vision.update
strategic_vision.delete
strategic_vision.manage_links
```

Toutes les routes doivent utiliser :

```text
JwtAuthGuard
ActiveClientGuard
ModuleAccessGuard
PermissionsGuard
```

---

## Lot Backend 5 — API Vision

Endpoints :

```text
GET    /api/strategic-vision
POST   /api/strategic-vision
GET    /api/strategic-vision/:id
PATCH  /api/strategic-vision/:id
DELETE /api/strategic-vision/:id
```

Règles :

```text
GET = strategic_vision.read
POST = strategic_vision.create
PATCH = strategic_vision.update
DELETE = strategic_vision.delete
```

DELETE doit être logique :

```text
status = ARCHIVED
```

Pas de suppression physique en V1.

---

## Lot Backend 6 — API Axes stratégiques

Endpoints :

```text
GET    /api/strategic-vision/:visionId/axes
POST   /api/strategic-vision/:visionId/axes
GET    /api/strategic-vision/:visionId/axes/:axisId
PATCH  /api/strategic-vision/:visionId/axes/:axisId
DELETE /api/strategic-vision/:visionId/axes/:axisId
```

Règles :

```text
Un axe appartient toujours à une vision du client actif.
Impossible de créer un axe sur une vision ARCHIVED.
DELETE = archivage logique.
sortOrder permet l’ordre d’affichage.
```

---

## Lot Backend 7 — API Objectifs stratégiques

Endpoints :

```text
GET    /api/strategic-vision/axes/:axisId/objectives
POST   /api/strategic-vision/axes/:axisId/objectives
GET    /api/strategic-vision/objectives/:objectiveId
PATCH  /api/strategic-vision/objectives/:objectiveId
DELETE /api/strategic-vision/objectives/:objectiveId
```

Règles :

```text
Un objectif appartient toujours à un axe du client actif.
progressPercent doit être entre 0 et 100.
targetDate est optionnelle.
healthStatus est calculable ou saisissable selon V1.
DELETE = archivage logique.
```

---

## Lot Backend 8 — API Liens stratégiques

Endpoints :

```text
GET    /api/strategic-vision/objectives/:objectiveId/links
POST   /api/strategic-vision/objectives/:objectiveId/links
PATCH  /api/strategic-vision/objectives/:objectiveId/links/:linkId
DELETE /api/strategic-vision/objectives/:objectiveId/links/:linkId
```

Règles :

```text
targetType obligatoire
targetId obligatoire sauf targetType = MANUAL
alignmentScore optionnel entre 0 et 100
Vérifier que l’objet cible appartient au client actif
Interdire les doublons objectiveId + targetType + targetId
```

Exemple :

```text
Objectif : Réduire les incidents critiques de 30 %
Lien : Projet SOC / alignmentScore 85
```

---

## Lot Backend 9 — KPI stratégiques

Endpoint existant ou à compléter :

```text
GET /api/strategic-vision/kpis
```

Contrat attendu :

```ts
{
  projectAlignmentRate: number;
  unalignedProjectsCount: number;
  objectivesAtRiskCount: number;
  objectivesOffTrackCount: number;
  overdueObjectivesCount: number;
  generatedAt: string;
}
```

Calculs recommandés :

```text
projectAlignmentRate =
nombre de projets liés à au moins un objectif / nombre total de projets actifs

unalignedProjectsCount =
projets actifs sans StrategicLink

objectivesAtRiskCount =
objectifs avec healthStatus = AT_RISK

objectivesOffTrackCount =
objectifs avec healthStatus = OFF_TRACK

overdueObjectivesCount =
objectifs non terminés avec targetDate dépassée
```

---

## Lot Backend 10 — Alertes de désalignement

Endpoint existant ou à compléter :

```text
GET /api/strategic-vision/alerts
```

Contrat attendu :

```ts
{
  items: Array<{
    id: string;
    type: "OBJECTIVE_OVERDUE" | "OBJECTIVE_OFF_TRACK" | "PROJECT_UNALIGNED";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    targetType: "OBJECTIVE" | "PROJECT";
    targetLabel: string;
    message: string;
    createdAt: string;
  }>;
  total: number;
}
```

Règles :

```text
Objectif en retard = alerte OBJECTIVE_OVERDUE
Objectif OFF_TRACK = alerte OBJECTIVE_OFF_TRACK
Projet actif non relié = alerte PROJECT_UNALIGNED
```

En V1, ces alertes peuvent être calculées à la demande sans persistance dans la table Alert transverse.

---

## Lot Backend 11 — Audit logs

Actions à auditer :

```text
strategic_vision.created
strategic_vision.updated
strategic_vision.archived

strategic_axis.created
strategic_axis.updated
strategic_axis.archived

strategic_objective.created
strategic_objective.updated
strategic_objective.archived

strategic_link.created
strategic_link.updated
strategic_link.deleted
```

---

# 5. Développement frontend

## Lot Frontend 1 — Routes

Créer ou compléter :

```text
apps/web/src/app/(protected)/strategic-vision/page.tsx
```

Route :

```text
/strategic-vision
```

---

## Lot Frontend 2 — Structure feature

Dossier cible :

```text
apps/web/src/features/strategic-vision/
```

Structure recommandée :

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

---

## Lot Frontend 3 — API client et query keys

Créer ou compléter :

```text
strategic-vision.api.ts
strategic-vision.queries.ts
strategic-vision.mutations.ts
strategic-vision.types.ts
strategic-vision.schemas.ts
```

Query keys tenant-aware :

```ts
strategicVisionKeys = {
  all: (clientId: string) => ['strategic-vision', clientId],
  list: (clientId: string) => ['strategic-vision', clientId, 'list'],
  detail: (clientId: string, visionId: string) => ['strategic-vision', clientId, 'detail', visionId],
  axes: (clientId: string, visionId: string) => ['strategic-vision', clientId, visionId, 'axes'],
  objectives: (clientId: string, axisId: string) => ['strategic-vision', clientId, 'axis', axisId, 'objectives'],
  links: (clientId: string, objectiveId: string) => ['strategic-vision', clientId, 'objective', objectiveId, 'links'],
  kpis: (clientId: string) => ['strategic-vision', clientId, 'kpis'],
  alerts: (clientId: string) => ['strategic-vision', clientId, 'alerts'],
}
```

---

## Lot Frontend 4 — Navigation sidebar

Ajouter dans le groupe **Gouvernance** :

```text
Vision stratégique
Cycles de pilotage
Objectifs stratégiques
Risques
Décisions
```

Permission d’affichage :

```text
strategic_vision.read
```

Icône recommandée :

```text
Target
Compass
Landmark
Network
```

---

## Lot Frontend 5 — Page principale

Structure de la page :

```text
Breadcrumb
PageHeader
KPI cards
Tabs
Contenu principal
```

Titre :

```text
Vision stratégique
```

Sous-titre :

```text
Définir le cap, structurer les axes et piloter l’alignement de l’organisation.
```

Actions :

```text
Modifier la vision
Ajouter un axe
Ajouter un objectif
```

---

## Lot Frontend 6 — Onglets

Onglets recommandés :

```text
Vue d’ensemble
Vision entreprise
Axes stratégiques
Objectifs
Alignement
Alertes
Historique
```

En V1, `Historique` peut afficher les audit logs si déjà accessibles, ou rester en placeholder propre.

---

## Lot Frontend 7 — Vue d’ensemble

Composants :

```text
strategic-vision-overview.tsx
strategic-kpi-cards.tsx
strategic-vision-statement-card.tsx
strategic-axes-summary.tsx
strategic-alerts-panel.tsx
alignment-trend-card.tsx
```

KPI à afficher :

```text
Score d’alignement global
Axes actifs
Objectifs en bonne trajectoire
Alertes de désalignement
Objectifs à risque
Projets non alignés
```

---

## Lot Frontend 8 — Vision entreprise

Objectif : afficher et modifier le texte de vision.

Champs :

```text
Titre
Horizon
Énoncé de vision
Description
Période
Statut
```

Composants :

```text
strategic-vision-form.tsx
strategic-vision-card.tsx
```

Règles UX :

```text
Afficher une belle carte “Notre vision”
Permettre l’édition uniquement avec strategic_vision.update
Ne pas afficher les enums brutes
Afficher les statuts en français
```

---

## Lot Frontend 9 — Axes stratégiques

Objectif : gérer les axes.

Vue :

```text
Cartes d’axes
Score / progression
Nombre d’objectifs liés
Statut
Actions
```

Composants :

```text
strategic-axis-card.tsx
strategic-axis-form-dialog.tsx
strategic-axes-grid.tsx
```

Actions :

```text
Créer un axe
Modifier un axe
Archiver un axe
Réordonner les axes
```

---

## Lot Frontend 10 — Objectifs stratégiques

Vue table :

```text
Objectif
Axe
Responsable
Échéance
Avancement
Statut
Santé
Actions
```

Composants :

```text
strategic-objectives-table.tsx
strategic-objective-form-dialog.tsx
strategic-objective-status-badge.tsx
strategic-objective-health-badge.tsx
```

Filtres :

```text
Axe
Responsable
Statut
Santé
Échéance dépassée
Recherche
```

---

## Lot Frontend 11 — Alignement

Objectif : visualiser les liens entre objectifs et objets Starium.

Vue recommandée :

```text
Objectif stratégique
→ Projets liés
→ Budgets liés
→ Risques liés
→ Score d’alignement
```

Composants :

```text
strategic-alignment-matrix.tsx
strategic-link-dialog.tsx
strategic-link-target-selector.tsx
alignment-score-badge.tsx
```

Actions :

```text
Lier un projet
Lier un budget
Lier un risque
Modifier le score d’alignement
Supprimer un lien
```

Règle UI majeure :

```text
Ne jamais afficher un ID seul.
Toujours afficher un libellé métier : nom projet, code projet, nom budget, nom risque.
```

---

## Lot Frontend 12 — Alertes

Vue :

```text
Liste des alertes de désalignement
Sévérité
Objet concerné
Message
Date
Action recommandée
```

Composants :

```text
strategic-alerts-list.tsx
strategic-alert-card.tsx
strategic-alert-severity-badge.tsx
```

Types d’alertes :

```text
Objectif en retard
Objectif hors trajectoire
Projet non aligné
```

---

## Lot Frontend 13 — Design Starium

Couleurs :

```text
Noir : #1B1B1B
Blanc : #FFFFFF
Or : #DB9801
Gris clair : #F5F5F5
Bordures : #E5E7EB
```

Règles :

```text
Sidebar noire
Workspace blanc
Accents or pour actions principales et éléments actifs
Badges lisibles
Cartes KPI sobres
Tableaux aérés
```

---

# 6. Ordre de développement recommandé

## Sprint 1 — Backend socle

```text
Vérifier modèles existants
Compléter schema.prisma si nécessaire
Créer / compléter DTO
Créer / compléter service
Créer / compléter controller
Vérifier RBAC strategic_vision
```

## Sprint 2 — Vision / axes / objectifs

```text
CRUD Vision
CRUD Axes
CRUD Objectifs
Archivage logique
Audit logs
Tests isolation client
```

## Sprint 3 — KPI et alertes

```text
GET /strategic-vision/kpis
GET /strategic-vision/alerts
Calcul alignement projets
Objectifs en retard
Objectifs à risque
Tests service
```

## Sprint 4 — Frontend cockpit

```text
Route /strategic-vision
KPI cards
Vue d’ensemble
Carte Notre vision
Cartes axes stratégiques
Panel alertes
```

## Sprint 5 — Frontend édition

```text
Formulaire vision
Formulaire axes
Formulaire objectifs
Tables objectifs
Filtres
Permissions UI
```

## Sprint 6 — Alignement

```text
Matrice d’alignement
Création StrategicLink
Sélection projet / budget / risque
Score d’alignement
Badges
```

## Sprint 7 — Stabilisation

```text
Tests frontend
États loading / error / empty / success
Corrections UX
Contrôle RBAC
Documentation API
Documentation module
```

---

# 7. Tests attendus

## Backend

```text
Créer une vision avec client actif
Refuser création sans client actif
Refuser accès sans strategic_vision.read
Refuser modification sans strategic_vision.update
Filtrer toutes les lectures par clientId
Interdire l’accès cross-client
Créer un axe sur une vision du client actif
Refuser un axe sur vision hors client
Créer un objectif sur axe du client actif
Calculer les KPI correctement
Retourner les alertes de désalignement
Archiver sans suppression physique
Écrire les audit logs
```

## Frontend

```text
Afficher loading
Afficher error
Afficher empty state
Afficher KPI
Afficher vision
Afficher axes
Afficher objectifs
Créer / modifier vision selon permission
Masquer actions sans permission
Ne jamais afficher d’ID brut
Query keys avec clientId
Invalidation après mutation
```

---

# 8. Prompt Cursor prêt à copier

```text
Tu dois implémenter ou compléter le module “Vision stratégique” dans Starium Orchestra.

Objectif :
Structurer la vision, les axes stratégiques, les objectifs, les liens d’alignement, les KPI et les alertes de désalignement.

Contraintes impératives :
- Tu dois uniquement modifier le plan du module Vision stratégique.
- Ne pas refondre les modules Projets, Budgets, Risques ou Cycles de pilotage.
- Le module Vision stratégique sert à aligner, pas à exécuter.
- Le backend reste source de vérité.
- Le frontend ne doit porter aucune logique métier critique.
- Toutes les routes métier doivent être préfixées par /api.
- Toutes les routes métier doivent être scopées client via X-Client-Id.
- Ne jamais accepter clientId dans les DTO.
- Utiliser les guards standards :
  JwtAuthGuard, ActiveClientGuard, ModuleAccessGuard, PermissionsGuard.
- Respecter le RBAC strategic_vision.
- Aucun ID brut ne doit être affiché seul dans l’UI.

Avant de coder :
- Vérifie l’existant dans apps/api/prisma/schema.prisma.
- Vérifie l’existant dans apps/api/src/modules/strategic-vision/.
- Vérifie l’existant dans apps/web/src/features/strategic-vision/.
- Ne recrée pas des modèles, services, contrôleurs ou composants déjà existants.
- Complète uniquement ce qui manque.

Backend :
- Compléter ou créer les modèles :
  StrategicVision
  StrategicAxis
  StrategicObjective
  StrategicLink

- Prévoir les statuts :
  StrategicVisionStatus : DRAFT, ACTIVE, ARCHIVED
  StrategicAxisStatus : ACTIVE, INACTIVE, ARCHIVED
  StrategicObjectiveStatus : DRAFT, ACTIVE, COMPLETED, ARCHIVED
  StrategicObjectiveHealthStatus : ON_TRACK, AT_RISK, OFF_TRACK
  StrategicLinkTargetType : PROJECT, BUDGET, BUDGET_LINE, RISK, GOVERNANCE_CYCLE, MANUAL

- Compléter ou créer le module :
  apps/api/src/modules/strategic-vision/

Endpoints à livrer :
- GET /api/strategic-vision
- POST /api/strategic-vision
- GET /api/strategic-vision/:id
- PATCH /api/strategic-vision/:id
- DELETE /api/strategic-vision/:id

- GET /api/strategic-vision/:visionId/axes
- POST /api/strategic-vision/:visionId/axes
- GET /api/strategic-vision/:visionId/axes/:axisId
- PATCH /api/strategic-vision/:visionId/axes/:axisId
- DELETE /api/strategic-vision/:visionId/axes/:axisId

- GET /api/strategic-vision/axes/:axisId/objectives
- POST /api/strategic-vision/axes/:axisId/objectives
- GET /api/strategic-vision/objectives/:objectiveId
- PATCH /api/strategic-vision/objectives/:objectiveId
- DELETE /api/strategic-vision/objectives/:objectiveId

- GET /api/strategic-vision/objectives/:objectiveId/links
- POST /api/strategic-vision/objectives/:objectiveId/links
- PATCH /api/strategic-vision/objectives/:objectiveId/links/:linkId
- DELETE /api/strategic-vision/objectives/:objectiveId/links/:linkId

- GET /api/strategic-vision/kpis
- GET /api/strategic-vision/alerts

Permissions :
- strategic_vision.read
- strategic_vision.create
- strategic_vision.update
- strategic_vision.delete
- strategic_vision.manage_links

Règles métier :
- Toutes les lectures et écritures doivent être filtrées par clientId.
- DELETE doit faire un archivage logique.
- Impossible de modifier une vision ARCHIVED.
- Impossible de créer un axe sur une vision ARCHIVED.
- progressPercent doit être entre 0 et 100.
- alignmentScore doit être entre 0 et 100.
- Un StrategicLink ne doit jamais modifier l’objet cible.
- Vérifier que les objets liés appartiennent au client actif.
- Interdire les doublons objectiveId + targetType + targetId.
- Les KPI sont calculés côté backend.
- Les alertes de désalignement sont calculées côté backend.

Frontend :
- Compléter ou créer la route :
  apps/web/src/app/(protected)/strategic-vision/page.tsx

- Compléter ou créer :
  apps/web/src/features/strategic-vision/

Structure frontend :
- api/
- hooks/
- components/
- schemas/
- types/
- mappers/
- utils/
- constants/

Écran :
- Route : /strategic-vision
- Onglets :
  Vue d’ensemble
  Vision entreprise
  Axes stratégiques
  Objectifs
  Alignement
  Alertes
  Historique

Composants à prévoir :
- strategic-kpi-cards.tsx
- strategic-vision-card.tsx
- strategic-vision-form.tsx
- strategic-axes-grid.tsx
- strategic-axis-card.tsx
- strategic-axis-form-dialog.tsx
- strategic-objectives-table.tsx
- strategic-objective-form-dialog.tsx
- strategic-alignment-matrix.tsx
- strategic-link-dialog.tsx
- strategic-alerts-list.tsx

Design :
- Respecter les couleurs Starium :
  Noir #1B1B1B
  Blanc #FFFFFF
  Or #DB9801
- Sidebar noire.
- Workspace blanc.
- Accent principal or.
- Badges métier lisibles.
- Ne jamais afficher les enums brutes.
- Ne jamais afficher d’ID seul.

Tests attendus :
- création vision avec client actif
- refus sans client actif
- refus sans permission
- isolation client stricte
- archivage logique
- création axe
- création objectif
- création lien stratégique
- rejet lien vers objet hors client
- calcul KPI
- alertes de désalignement
- query keys frontend avec clientId
- états loading / error / empty / success
- aucun ID brut affiché dans l’UI

Ne pas implémenter en V1 :
- pas d’IA
- pas d’export PDF avancé
- pas de workflow complexe
- pas de schéma directeur complet
- pas de modification automatique des projets
- pas d’arbitrage automatique
```

Le plan est bon pour lancer une V1 robuste : **Vision → Axes → Objectifs → Alignement → KPI → Alertes**.
