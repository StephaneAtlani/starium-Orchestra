# 📊 État réel — Module Projets (Scénarios)

| RFC                | Nom                         | Description                                                                                | État      |
| ------------------ | --------------------------- | ------------------------------------------------------------------------------------------ | --------- |
| RFC-PROJ-SC-001    | Project Scenario Core       | Ajouter entité `ProjectScenario` + sélection automatique / archivage                       | ❌ À faire |
| RFC-PROJ-SC-002    | Scenario Financial Planning | Prévision par ligne budgétaire (via `ProjectBudgetLink`, sans dupliquer la finance)        | ❌ À faire |
| RFC-PROJ-SC-003    | Scenario Resource Planning  | Allocation ressources par scénario (charge, période, rôle)                                 | ❌ À faire |
| RFC-PROJ-SC-004    | Scenario Planning (Gantt)   | Planning indépendant par scénario (tâches, dates, dépendances)                             | ❌ À faire |
| RFC-PROJ-SC-005    | Scenario Capacity Engine    | Calcul charge vs capacité (surcharge / sous-charge)                                        | ❌ À faire |
| RFC-PROJ-SC-006    | Scenario Risk Modeling      | Gestion des risques par scénario (probabilité, impact, criticité)                          | ❌ À faire |
| RFC-PROJ-SC-007    | Scenario Selection Workflow | Sélection scénario lors passage `PLANNED / IN_PROGRESS` + archivage automatique des autres | ❌ À faire |
| RFC-FE-PROJ-SC-001 | Scenarios Tab UI            | Onglet Scénarios dans fiche projet (création, duplication, sélection, archivage)           | ❌ À faire |
| RFC-FE-PROJ-SC-002 | Scenario Cockpit UI         | Vue cockpit : scénario actif vs réel (budget, charge, délais, risques)                     | ❌ À faire |

---

# 🧠 Ce qui est **partiellement couvert mais incomplet**

| RFC             | Nom                     | Description                                                               | État       |
| --------------- | ----------------------- | ------------------------------------------------------------------------- | ---------- |
| RFC-PROJ-010    | Budget Links            | Liaison projet ↔ budget OK mais pas exploité pour scénarios               | ⚠️ Partiel |
| RFC-RES-002     | Resource Assignment     | Affectation ressources prévue mais pas intégrée dans une logique scénario | ⚠️ Partiel |
| RFC-PROJ-013    | Portfolio Dashboard API | KPI disponibles mais sans notion de simulation / projection               | ⚠️ Partiel |
| RFC-FE-PROJ-008 | Portfolio Cockpit UI    | Cockpit existant mais sans scénarios ni comparaison décisionnelle         | ⚠️ Partiel |

---

# ⚠️ Ce qui est **techniquement faisable mais produit non fini**

| Domaine | Problème réel                                                                  |
| ------- | ------------------------------------------------------------------------------ |
| Projets | Très bon pilotage (tâches, risques, jalons, budget links)                      |
| MAIS    | ❌ Pas de **simulation projet avant exécution**                                 |
| Impact  | Impossible de faire des arbitrages CODIR (coût / délai / ressources / risques) |

---

# 🔴 Les 3 vrais trous produits (prioritaires)

## 1. 🧠 Absence de simulation (critique)

* Pas de :

  * scénarios multiples
  * hypothèses projet
  * comparaison d’options

👉 impossible de décider avant d’exécuter

---

## 2. ⚖️ Absence de croisement charge / capacité

* Pas de :

  * vision surcharge équipe
  * arbitrage staffing

👉 bloque la planification réaliste

---

## 3. 🔄 Absence de baseline projet

* Pas de :

  * scénario retenu unique
  * historique de décision
  * référence de pilotage

👉 impossible de mesurer dérive

---

# 🧭 Lecture stratégique

Aujourd’hui :

👉 Tu sais **suivre un projet**

Mais tu ne sais pas encore :

> 🔥 décider quel projet lancer et comment

Aligné avec la vision Starium :

* cockpit décisionnel
* simulation avant engagement
* pilotage multi-dimensionnel

---

# 🎯 Priorisation recommandée

## Ordre optimal :

1. **RFC-PROJ-SC-001 (Scenario Core)**
   👉 fondation (modèle + sélection)

2. **RFC-PROJ-SC-002 (Finance scénario)**
   👉 connecte au core financier

3. **RFC-PROJ-SC-007 (Selection Workflow)**
   👉 transforme en outil décisionnel

4. **RFC-PROJ-SC-003 + SC-005 (Ressources + Capacité)**
   👉 rend le modèle réaliste

5. **RFC-PROJ-SC-004 (Planning scénario)**
   👉 ajoute la dimension délai

6. **RFC-PROJ-SC-006 (Risques)**
   👉 complète la vision CODIR

7. **Frontend (Scenarios + Cockpit)**
   👉 seulement après backend

