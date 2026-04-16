# 📊 État réel — Module Projets (Scénarios)

_Dernière mise à jour : avril 2026. Ce plan formalise la couche **simulation / baseline / arbitrage** manquante au module Projets. Le dépôt sait déjà gérer un projet en exécution (budget links, tâches, risques, historisation), mais pas encore comparer plusieurs options avant engagement._

| RFC | Nom | Description | État |
| --- | --- | --- | --- |
| RFC-PROJ-SC-001 | Project Scenario Core | Socle `ProjectScenario`, duplication, baseline, archivage | ❌ À faire |
| RFC-PROJ-SC-002 | Scenario Financial Planning | Projection financière scénario alignée sur `ProjectBudgetLink` et le core budget | ❌ À faire |
| RFC-PROJ-SC-003 | Scenario Resource Planning | Plan de charge / rôle / période par scénario sur `Resource` | ❌ À faire |
| RFC-PROJ-SC-004 | Scenario Planning Gantt | Planning autonome par scénario | ❌ À faire |
| RFC-PROJ-SC-005 | Scenario Capacity Engine | Calcul charge vs capacité pour juger la faisabilité | ❌ À faire |
| RFC-PROJ-SC-006 | Scenario Risk Modeling | Modélisation des risques projetés par scénario | ❌ À faire |
| RFC-PROJ-SC-007 | Scenario Selection Workflow | Sélection atomique de la baseline et archivage des variantes | ❌ À faire |
| RFC-FE-PROJ-SC-001 | Scenarios Tab UI | Onglet Scénarios dans la fiche projet | ❌ À faire |
| RFC-FE-PROJ-SC-002 | Scenario Cockpit UI | Cockpit décisionnel scénario vs baseline vs réel | ❌ À faire |

---

# 🧠 Ce qui est déjà réutilisable

| RFC | Apport pour les scénarios | État |
| --- | --- | --- |
| RFC-PROJ-010 | Lien projet ↔ budget déjà en place, base de raccord pour les projections financières | ✅ Implémenté (MVP) |
| RFC-PROJ-011 / RFC-PROJ-012 | Tâches, jalons, gantt, structure planning existante | ✅ Implémenté (MVP) |
| RFC-PROJ-013 | Historisation des décisions projet | ✅ Implémenté (MVP) |
| RFC-PROJ-018 + RFC-RISK-TAXONOMY | Registre de risques + taxonomie déjà disponibles | ✅ Implémenté (MVP) |
| RFC-RES-001 | Référentiel ressources client-scopé | 🟡 Partiel |
| RFC-TEAM-009 | Temps réalisé, utile pour comparer le réel à la baseline | ✅ Implémenté (MVP) |
| RFC-FE-PROJ-008 | Cockpit projet existant, réutilisable pour héberger la vue scénario plus tard | ⚠️ Partiel |

---

# ⚠️ Contraintes d’architecture

- Les scénarios restent **strictement client-scopés**.
- La sélection de baseline doit être une **règle backend transactionnelle**, pas un simple état UI.
- La finance scénario **réutilise** le core budget ; aucun moteur financier parallèle.
- Le staffing scénario ne doit **pas** réintroduire les anciens modèles retirés `RFC-TEAM-007` / `RFC-TEAM-008`.
- Tous les écrans affichent des **libellés métier** (`name`, `code`, `label`) et jamais des IDs bruts.

---

# 🔴 Les vrais trous produit

## 1. Simulation avant engagement

Il manque :

- scénarios multiples
- hypothèses comparables
- arbitrage d’options

Impact :

> impossible de décider proprement avant exécution

---

## 2. Baseline unique et historisée

Il manque :

- scénario retenu unique
- archivage des alternatives
- trace explicite de la décision

Impact :

> impossible de mesurer sérieusement la dérive du projet

---

## 3. Faisabilité réaliste

Il manque :

- croisement budget / charge / délai / risque
- calcul charge vs capacité
- cockpit d’arbitrage

Impact :

> les projets restent pilotables après lancement, mais pas véritablement décidables avant lancement

---

# 🎯 Plan d’implémentation recommandé

## Phase 1 — Fondations décisionnelles

1. `RFC-PROJ-SC-001` — créer `ProjectScenario`, duplication, baseline, archivage.
2. `RFC-PROJ-SC-007` — brancher le workflow de sélection sur les transitions projet `PLANNED` / `IN_PROGRESS`.

Résultat attendu :

- plusieurs variantes par projet
- une baseline unique
- historique de décision exploitable

## Phase 2 — Finance scénario

3. `RFC-PROJ-SC-002` — projections financières par scénario, raccordées à `ProjectBudgetLink`.

Résultat attendu :

- comparaison coût projeté / baseline / réel
- première vraie lecture d’arbitrage CODIR

## Phase 3 — Ressources et faisabilité

4. `RFC-PROJ-SC-003` — plan de ressources scénario.
5. `RFC-PROJ-SC-005` — moteur charge vs capacité.

Résultat attendu :

- arbitrage staffing réaliste
- détection des surcharges avant engagement

## Phase 4 — Délai

6. `RFC-PROJ-SC-004` — planning autonome scénario.

Résultat attendu :

- comparaison d’options temporelles
- projection de date de fin et chemin critique

## Phase 5 — Risque

7. `RFC-PROJ-SC-006` — registre de risques projetés.

Résultat attendu :

- arbitrage coût / délai / charge / risque réellement multidimensionnel

## Phase 6 — Frontend décisionnel

8. `RFC-FE-PROJ-SC-001` — onglet Scénarios dans la fiche projet.
9. `RFC-FE-PROJ-SC-002` — cockpit décisionnel scénario.

Résultat attendu :

- outillage concret pour créer, comparer et sélectionner
- cockpit de décision lisible pour COPIL / CODIR

---

# 🧪 Plan de tests cible

## Backend

- isolation inter-client sur toutes les lectures et écritures
- unicité du scénario `SELECTED`
- transaction de sélection + archivage
- cohérence des agrégats financiers / charge / risque
- blocage des références cross-scenario ou cross-client

## Frontend

- aucun ID brut visible
- création / duplication / sélection d’un scénario
- affichage cohérent des badges baseline / archive
- comparaison lisible entre scénario, baseline et réel

---

# 🧭 Lecture stratégique

Aujourd’hui, Starium sait **suivre un projet**.  
Avec cette roadmap, Starium saura aussi **décider quel scénario lancer**, puis utiliser ce scénario comme baseline de pilotage.

C’est la vraie marche qui fait passer le module Projets :

- d’un bon outil d’exécution
- à un cockpit d’arbitrage et de gouvernance

