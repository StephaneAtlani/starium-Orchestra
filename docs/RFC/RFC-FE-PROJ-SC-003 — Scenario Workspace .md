## RFC-FE-PROJ-SC-003 — Scenario Workspace (édition scénario)

### 1) Objectif

Mettre en place une **page dédiée d’édition d’un scénario projet** permettant de piloter l’ensemble des dimensions métier du scénario.

Cette page est le **point central d’exploitation des RFC SC-002 à SC-006**.

---

### 2) Positionnement (verrouillé)

Un scénario est un **objet de travail complet**, pas une simple ligne de liste.

Architecture cible :

* `/projects/:projectId/scenarios` → registre des scénarios
* `/projects/:projectId/scenarios/:scenarioId` → **édition**
* `/projects/:projectId/scenarios/cockpit` → comparaison

---

### 3) Périmètre MVP

#### Inclus

* Route dédiée scénario
* Page d’édition
* Navigation interne (tabs)
* Affichage + édition des données scénario
* Intégration avec APIs existantes

#### Exclu

* Aucun changement backend
* Aucun nouveau modèle Prisma
* Pas de comparaison multi-scénarios ici
* Pas de cockpit dans cette page

---

### 4) Route (canonique)

```
/projects/:projectId/scenarios/:scenarioId
```

Fichier :

```
apps/web/src/app/(protected)/projects/[projectId]/scenarios/[scenarioId]/page.tsx
```

---

### 5) Navigation

Depuis la liste scénarios :

👉 Ajouter CTA obligatoire sur chaque carte :

* **« Ouvrir »** (libellé unique MVP)

Interdit :

* éditer via modale
* surcharger la liste

---

### 6) Structure de la page

#### Composant principal

```
ScenarioWorkspacePage
```

Responsabilités :

* charger scénario (detail API)
* gérer états (loading/error)
* afficher navigation interne
* orchestrer les sous-modules

---

### 7) Navigation interne (tabs)

Tabs obligatoires :

* Vue d’ensemble
* Budget
* Ressources
* Planning
* Capacité
* Risques

Fichier :

```
features/projects/scenario-workspace/ScenarioWorkspaceTabs.tsx
```

---

### 8) Data flow

#### Queries

* getProjectScenario(projectId, scenarioId)

Réutilisation stricte :

* query key existante
* pas de duplication cache

---

### 9) Composants à créer

```
features/projects/scenario-workspace/
```

### Obligatoires :

* ScenarioWorkspacePage
* ScenarioWorkspaceTabs
* ScenarioOverviewPanel
* ScenarioBudgetPanel
* ScenarioResourcePanel
* ScenarioTimelinePanel
* ScenarioCapacityPanel
* ScenarioRiskPanel

---

### 10) Règles UX critiques

#### 🔒 Règle 1 — Pas d’ID

* jamais afficher scenarioId
* uniquement name / code / labels

#### 🔒 Règle 2 — Scénario archivé

* édition interdite si ARCHIVED
* UI en lecture seule

#### 🔒 Règle 3 — Baseline

* badge BASELINE visible si SELECTED
* non éditable différemment (pas de restriction métier MVP)

---

### 11) Interaction avec les autres RFC

| RFC    | Intégration         |
| ------ | ------------------- |
| SC-002 | Cockpit → lecture   |
| SC-003 | Workspace → édition |
| SC-004 | Budget              |
| SC-005 | Ressources          |
| SC-006 | Risques             |

👉 Cette page est le **hub**

---

### 12) États UI

* loading
* error
* empty (scénario introuvable)
* success

---

### 13) Tests

À couvrir :

* navigation depuis liste
* affichage correct scénario
* tabs fonctionnels
* blocage édition si ARCHIVED
* aucun ID visible

---

### 14) Points de vigilance

* ne pas recréer un mini cockpit ici
* ne pas dupliquer logique backend
* éviter surcharge UI
* garder cohérence avec ProjectWorkspace

---

### 15) Résultat attendu

* édition complète d’un scénario
* UI scalable pour futures RFC
* séparation claire :

  * gestion (liste)
  * édition (workspace)
  * décision (cockpit)

---

## Conclusion

👉 Sans cette RFC :

* ton cockpit n’a pas de sens
* tes scénarios ne sont pas exploitables

👉 Avec cette RFC :

* tu transformes les scénarios en **vrai outil de pilotage**

---

### 16) Implémentation (référence code — avril 2026)

Comportement aligné sur le plan verrouillé (tabs **locales** sans sous-route ni `?tab=` ; pas de réutilisation du module **cockpit** dans le workspace ; PATCH **uniquement** `name`, `code`, `description`, `assumptionSummary`).

| Élément | Emplacement |
| ------- | ----------- |
| Route Next.js | `apps/web/src/app/(protected)/projects/[projectId]/scenarios/[scenarioId]/page.tsx` |
| Feature | `apps/web/src/features/projects/scenario-workspace/` — `ScenarioWorkspacePage`, `ScenarioWorkspaceTabs`, panneaux par dimension, `ScenarioSummaryPanel` (affichage homogène des `*Summary` du détail API), `scenario-patch-payload.ts`, `invalidate-after-scenario-update.ts`, `scenario-workspace-readonly.ts` |
| Helper route | `projectScenarioWorkspace(projectId, scenarioId)` dans `features/projects/constants/project-routes.ts` |
| API client | `updateProjectScenario` (PATCH) + type `UpdateProjectScenarioPayload` dans `features/projects/api/projects.api.ts` et `project.types.ts` |
| Mutation React Query | `updateMutation` dans `features/projects/hooks/use-project-scenarios-mutations.ts` — invalidations : `scenarioDetail`, `scenarios`, `detail` projet |
| Query | `useProjectScenarioQuery` + clé `projectQueryKeys.scenarioDetail` (inchangée) |
| Liste scénarios | CTA **Ouvrir** sur `ScenarioCard` (lien vers le workspace) |
| Tests | `scenario-workspace/*.spec.ts`, extensions `project-scenarios-view.spec.ts`, `use-project-scenarios-mutations.spec.ts` |
