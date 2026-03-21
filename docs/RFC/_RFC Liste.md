👉 **1. PRIORITÉ = module projet (portefeuille & pilotage)**
👉 **2. ENSUITE = budget prévisionnel (forecast / atterrissage)**

Objectif :

> construire d’abord **le moteur de pilotage réel**, puis brancher le budget dessus

---

# 🧭 ROADMAP PRIORISÉE — PROJET → BUDGET PRÉVISIONNEL

---

## 🔥 NIVEAU 1 — MODULE PROJET (CRITIQUE PRODUIT)

👉 Sans ça :

* tu n’as pas de cockpit
* tu n’as pas de pilotage réel
* le budget n’a pas de sens métier

---

### 🧱 BACKEND — SOCLE PROJET

| Ordre | RFC              | Nom                             | Objectif          | Résultat concret                 | Priorité | État    |
| ----- | ---------------- | ------------------------------- | ----------------- | -------------------------------- | -------- | ------- |
| **1** | **RFC-PROJ-001** | Cadrage fonctionnel             | Définir périmètre | Vision claire projet vs activité | 🔥🔥🔥   | Implémenté (MVP) |
| **2** | **RFC-PROJ-002** | Prisma Schema Portefeuille      | Modèle de données | `PortfolioItem`, `Task`, `Risk`  | 🔥🔥🔥   | À faire |
| **3** | **RFC-PROJ-003** | Règles métier                   | Cohérence backend | validations, health, statuts     | 🔥🔥🔥   | À faire |
| **4** | **RFC-PROJ-004** | Portfolio Management Backend    | CRUD portefeuille | API `/portfolio-items`           | 🔥🔥🔥   | À faire |
| **5** | **RFC-PROJ-005** | Tasks Backend                   | Exécution         | API tâches                       | 🔥🔥🔥   | À faire |
| **6** | **RFC-PROJ-006** | Risks Backend                   | Pilotage risques  | API risques                      | 🔥🔥🔥   | À faire |
| **7** | **RFC-PROJ-008** | Permissions & Module Activation | Sécuriser         | RBAC                             | 🔥🔥🔥   | À faire |
| **8** | **RFC-PROJ-009** | Audit Logs Projet               | Traçabilité       | audit complet                    | 🔥🔥🔥   | À faire |

---

### 🧩 BACKEND — LIENS CRITIQUES

| Ordre  | RFC              | Nom            | Objectif                   | Résultat          |
| ------ | ---------------- | -------------- | -------------------------- | ----------------- |
| **9**  | **RFC-PROJ-010** | Budget Links   | Lier projet ↔ budget       | mapping propre    |
| **10** | **RFC-PROJ-011** | Supplier Links | Lier projet ↔ fournisseurs | vision transverse |

---

### 👥 BACKEND — RESSOURCES (FONDATION)

| Ordre  | RFC             | Nom                 | Objectif            | Résultat                |
| ------ | --------------- | ------------------- | ------------------- | ----------------------- |
| **11** | **RFC-RES-001** | Resource Registry   | Registre ressources | table Resource          |
| **12** | **RFC-RES-002** | Resource Assignment | Affectation         | lien projet ↔ ressource |

---

---

### 🖥️ FRONTEND — SOCLE PROJET

| Ordre  | RFC                         | Nom                   | Objectif            | Résultat concret   | Priorité |
| ------ | --------------------------- | --------------------- | ------------------- | ------------------ | -------- |
| **13** | **RFC-FE-PROJ-001** *(NEW)* | Portfolio List UI     | Vue globale         | `/portfolio`       | 🔥🔥🔥   |
| **14** | **RFC-FE-PROJ-002** *(NEW)* | Portfolio Detail UI   | Cockpit projet      | `/portfolio/[id]`  | 🔥🔥🔥   |
| **15** | **RFC-FE-PROJ-003** *(NEW)* | Tasks Tab UI          | Pilotage exécution  | tâches             | 🔥🔥🔥   |
| **16** | **RFC-FE-PROJ-004** *(NEW)* | Risks Tab UI          | Pilotage risques    | risques            | 🔥🔥🔥   |
| **17** | **RFC-FE-PROJ-005** *(NEW)* | Resources Tab UI      | Pilotage ressources | affectations       | 🔥🔥🔥   |
| **18** | **RFC-FE-PROJ-006** *(NEW)* | Budget Links Tab UI   | Voir budget lié     | liens budget       | 🔥🔥🔥   |
| **19** | **RFC-FE-PROJ-007** *(NEW)* | Supplier Links Tab UI | Voir fournisseurs   | liens fournisseurs | 🔥🔥🔥   |
| **20** | **RFC-FE-PROJ-011** *(NEW)* | Project Health UI     | Statut projet       | badge santé        | 🔥🔥🔥   |

---

## 💥 LIVRABLE FIN NIVEAU 1

👉 À ce stade tu as :

* portefeuille projets & activités
* pilotage réel (tâches + risques)
* ressources affectées
* liens budget + fournisseurs
* statut santé projet

👉 Tu es déjà un **outil DSI / DG exploitable**

---

# ⚙️ NIVEAU 2 — BUDGET PRÉVISIONNEL (FORECAST)

👉 Maintenant seulement, le budget devient **intelligent**, car relié au réel

---

### 🧱 BACKEND — FORECAST

| Ordre  | RFC     | Nom                     | Objectif         | Résultat       |
| ------ | ------- | ----------------------- | ---------------- | -------------- |
| **21** | RFC-024 | Budget Monthly Planning | Planning mensuel | 12 mois        |
| **22** | RFC-019 | Budget Versioning       | Historique       | versions       |
| **23** | RFC-016 | Budget Reporting API    | KPI              | reporting      |
| **24** | RFC-017 | Budget Reallocation     | Ajustement       | redistribution |
| **25** | RFC-021 | Analytical Dimensions   | Axes             | dimension      |

---

### 🖥️ FRONTEND — FORECAST CORE

| Ordre  | RFC                | Nom                   | Objectif      |
| ------ | ------------------ | --------------------- | ------------- |
| **26** | RFC-FE-005         | Budget Line Detail UI | compréhension |
| **27** | RFC-FE-029 *(NEW)* | Monthly Planning Grid | planning      |
| **28** | RFC-FE-030 *(NEW)* | Cell Calculation UI   | expliquer     |
| **29** | RFC-FE-031 *(NEW)* | Calculator & Apply    | accélérer     |

---

### 🧠 FRONTEND — PILOTAGE DG/DAF

| Ordre  | RFC                | Nom                   | Objectif     |
| ------ | ------------------ | --------------------- | ------------ |
| **30** | RFC-FE-002         | Budget Dashboard      | vision       |
| **31** | RFC-FE-032 *(NEW)* | Envelope Monthly View | pilotage     |
| **32** | RFC-FE-033 *(NEW)* | Landing Forecast      | atterrissage |
| **33** | RFC-FE-034 *(NEW)* | Landing Target        | cible        |
| **34** | RFC-FE-035 *(NEW)* | Landing Allocation    | déversement  |
| **35** | RFC-FE-027         | Alerts & Integrity    | sécurité     |

---

# 📊 NIVEAU 3 — FUSION PROJET + BUDGET

👉 Là tu deviens réellement différenciant

| Ordre  | RFC                     | Nom                        | Objectif       |
| ------ | ----------------------- | -------------------------- | -------------- |
| **36** | RFC-FE-PROJ-008 *(NEW)* | Portfolio Cockpit          | vision globale |
| **37** | RFC-FE-PROJ-012 *(NEW)* | Project vs Budget Analysis | dérive         |
| **38** | RFC-FE-036 *(NEW)*      | Forecast vs Landing        | écarts         |
| **39** | RFC-FE-PROJ-013 *(NEW)* | Delayed Projects Insights  | dérive projet  |
| **40** | RFC-FE-PROJ-015 *(NEW)* | Resource Load View         | charge         |

---

# 🧱 NIVEAU 4 — AVANCÉ

| Ordre  | RFC             |
| ------ | --------------- |
| **41** | RFC-PROJ-007    |
| **42** | RFC-PROJ-013    |
| **43** | RFC-PROJ-014    |
| **44** | RFC-RES-003     |
| **45** | RFC-FE-PROJ-016 |
| **46** | RFC-FE-PROJ-017 |
| **47** | RFC-FE-PROJ-018 |
| **48** | RFC-FE-PROJ-019 |
| **49** | RFC-FE-PROJ-020 |

