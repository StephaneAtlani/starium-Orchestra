# 📊 État réel — Module Projets (Scénarios)

*Dernière mise à jour : avril 2026. Ce plan formalise la couche **simulation / baseline / arbitrage** manquante au module Projets. Le dépôt sait déjà gérer un projet en exécution (budget links, tâches, risques, historisation), mais pas encore comparer plusieurs options avant engagement.*

| RFC                | Nom                         | Description                                                                      | Développement | État      |
| ------------------ | --------------------------- | -------------------------------------------------------------------------------- | ------------- | --------- |
| RFC-PROJ-SC-001    | Project Scenario Core       | Socle `ProjectScenario`, duplication légère, baseline, archivage                 | **Backend**   | ✅ Implémenté (MVP) |
| RFC-PROJ-SC-002    | Scenario Financial Planning | Projection financière scénario alignée sur `ProjectBudgetLink` et le core budget | **Backend**   | ✅ Implémenté (MVP) |
| RFC-PROJ-SC-003    | Scenario Resource Planning  | Plan de charge / rôle / période par scénario sur `Resource`                      | **Backend**   | ❌ À faire |
| RFC-PROJ-SC-004    | Scenario Planning Gantt     | Planning autonome par scénario                                                   | **Backend**   | ❌ À faire |
| RFC-PROJ-SC-005    | Scenario Capacity Engine    | Calcul charge vs capacité pour juger la faisabilité                              | **Backend**   | ❌ À faire |
| RFC-PROJ-SC-006    | Scenario Risk Modeling      | Modélisation des risques projetés par scénario                                   | **Backend**   | ❌ À faire |
| RFC-PROJ-SC-007    | Scenario Selection Workflow | Sélection atomique de la baseline et archivage des variantes                     | **Backend**   | ❌ À faire |
| RFC-FE-PROJ-SC-001 | Scenarios Tab UI            | Onglet Scénarios dans la fiche projet                                            | **Frontend**  | ❌ À faire |
| RFC-FE-PROJ-SC-002 | Scenario Cockpit UI         | Cockpit décisionnel scénario vs baseline vs réel                                 | **Frontend**  | ❌ À faire |

---

# 🧠 Ce qui est déjà réutilisable

| RFC                              | Apport pour les scénarios                                                            | Développement concerné | État               |
| -------------------------------- | ------------------------------------------------------------------------------------ | ---------------------- | ------------------ |
| RFC-PROJ-010                     | Lien projet ↔ budget déjà en place, base de raccord pour les projections financières | **Backend + Frontend** | ✅ Implémenté (MVP) |
| RFC-PROJ-011 / RFC-PROJ-012      | Tâches, jalons, gantt, structure planning existante                                  | **Backend + Frontend** | ✅ Implémenté (MVP) |
| RFC-PROJ-013                     | Historisation des décisions projet                                                   | **Backend**            | ✅ Implémenté (MVP) |
| RFC-PROJ-018 + RFC-RISK-TAXONOMY | Registre de risques + taxonomie déjà disponibles                                     | **Backend + Frontend** | ✅ Implémenté (MVP) |
| RFC-RES-001                      | Référentiel ressources client-scopé                                                  | **Backend + Frontend** | 🟡 Partiel         |
| RFC-TEAM-009                     | Temps réalisé, utile pour comparer le réel à la baseline                             | **Backend + Frontend** | ✅ Implémenté (MVP) |
| RFC-FE-PROJ-008                  | Cockpit projet existant, réutilisable pour héberger la vue scénario plus tard        | **Frontend**           | ⚠️ Partiel         |

---

# ⚠️ Contraintes d’architecture

* Les scénarios restent **strictement client-scopés**.
* La sélection de baseline doit être une **règle backend transactionnelle**, pas un simple état UI.
* La finance scénario **réutilise** le core budget ; aucun moteur financier parallèle.
* Le staffing scénario ne doit **pas** réintroduire les anciens modèles retirés `RFC-TEAM-007` / `RFC-TEAM-008`.
* Tous les écrans affichent des **libellés métier** (`name`, `code`, `label`) et jamais des IDs bruts.

---

# 🔴 Les vrais trous produit

## 1. Simulation avant engagement

Il manque :

* scénarios multiples
* hypothèses comparables
* arbitrage d’options

Impact :

> impossible de décider proprement avant exécution

---

## 2. Baseline unique et historisée

Il manque :

* scénario retenu unique
* archivage des alternatives
* trace explicite de la décision

Impact :

> impossible de mesurer sérieusement la dérive du projet

---

## 3. Faisabilité réaliste

Il manque :

* croisement budget / charge / délai / risque
* calcul charge vs capacité
* cockpit d’arbitrage

Impact :

> les projets restent pilotables après lancement, mais pas véritablement décidables avant lancement

---

# 🎯 Plan d’implémentation recommandé

## Phase 1 — Fondations décisionnelles

1. `RFC-PROJ-SC-001` — créer `ProjectScenario`, duplication légère, baseline, archivage.
   **Type : Backend**

2. `RFC-PROJ-SC-007` — brancher le workflow de sélection sur les transitions projet `PLANNED` / `IN_PROGRESS`.
   **Type : Backend**

Résultat attendu :

* plusieurs variantes par projet
* une baseline unique
* historique de décision exploitable

État réel :

* `ProjectScenario` livré côté backend
* sélection baseline transactionnelle livrée
* contrainte DB d’unicité `SELECTED` livrée
* résumés exposés avec `resourceSummary` / `timelineSummary` / `riskSummary` à `null` au MVP ; `budgetSummary` reste **`null` sur la liste** des scénarios, mais est **alimenté sur le détail** dès que des lignes `ProjectScenarioFinancialLine` existent (agrégat aligné sur `RFC-PROJ-SC-002`)

## Phase 2 — Finance scénario

3. `RFC-PROJ-SC-002` — projections financières par scénario, raccordées à `ProjectBudgetLink`.
   **Type : Backend**

Résultat attendu :

* comparaison coût projeté / baseline / réel
* première vraie lecture d’arbitrage CODIR

État réel (MVP backend livré) :

* Prisma `ProjectScenarioFinancialLine` + migration `20260420120000_project_scenario_financial_lines`
* Routes : `GET|POST|PATCH|DELETE /api/projects/:projectId/scenarios/:scenarioId/financial-lines`, `GET .../financial-summary`
* `GET /api/projects/:projectId/scenarios/:scenarioId` expose `budgetSummary` (même agrégat que `financial-summary`)
* Cockpit UI et reste du périmètre RFC (hors MVP) : voir `RFC-FE-PROJ-SC-001` / `RFC-FE-PROJ-SC-002`

## Phase 3 — Ressources et faisabilité

4. `RFC-PROJ-SC-003` — plan de ressources scénario.
   **Type : Backend**

5. `RFC-PROJ-SC-005` — moteur charge vs capacité.
   **Type : Backend**

Résultat attendu :

* arbitrage staffing réaliste
* détection des surcharges avant engagement

## Phase 4 — Délai

6. `RFC-PROJ-SC-004` — planning autonome scénario.
   **Type : Backend**

Résultat attendu :

* comparaison d’options temporelles
* projection de date de fin et chemin critique

## Phase 5 — Risque

7. `RFC-PROJ-SC-006` — registre de risques projetés.
   **Type : Backend**

Résultat attendu :

* arbitrage coût / délai / charge / risque réellement multidimensionnel

## Phase 6 — Frontend décisionnel

8. `RFC-FE-PROJ-SC-001` — onglet Scénarios dans la fiche projet.
   **Type : Frontend**

9. `RFC-FE-PROJ-SC-002` — cockpit décisionnel scénario.
   **Type : Frontend**

Résultat attendu :

* outillage concret pour créer, comparer et sélectionner
* cockpit de décision lisible pour COPIL / CODIR

---

# 🧪 Plan de tests cible

## Backend

* isolation inter-client sur toutes les lectures et écritures
* unicité du scénario `SELECTED`
* transaction de sélection + archivage
* cohérence des agrégats financiers / charge / risque
* blocage des références cross-scenario ou cross-client

## Frontend

* aucun ID brut visible
* création / duplication / sélection d’un scénario
* affichage cohérent des badges baseline / archive
* comparaison lisible entre scénario, baseline et réel

