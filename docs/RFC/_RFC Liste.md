# 🔥 PHASE 1 — MODULE PROJET (PRIORITÉ ABSOLUE)

## 🧱 BACKEND — PROJET

| Ordre | RFC              | Nom                 | Description                                                            | État      | Commentaire                                  |
| ----- | ---------------- | ------------------- | ---------------------------------------------------------------------- | --------- | -------------------------------------------- |
| 1     | **RFC-PROJ-001** | Cadrage fonctionnel | Définition du périmètre projet (projet, tâche, risque, cockpit)        | ✅ Couvert | Base MVP OK                                  |
| 2     | **RFC-PROJ-002** | Prisma Schema       | Modélisation DB : Project, Task, Risk, Milestone                       | ✅ Couvert | Structure OK                                 |
| 3     | **RFC-PROJ-003** | Règles métier       | Calcul health, statuts, cohérence projet                               | ✅ Couvert | Service existant                             |
| 4     | **RFC-PROJ-004** | Portfolio API       | CRUD projets + agrégats portefeuille                                   | ✅ Couvert | `/api/projects` OK                           |
| 5     | **RFC-PROJ-012** | Project Sheet       | Fiche projet décisionnelle pour arbitrer : valeur, coût, ROI, priorité | 🟡 En cours | API + UI fiche sur détail projet ; métriques portefeuille / règles avancées à compléter |
| 6     | **RFC-PROJ-005** | Tasks Backend       | Gestion exécution (tâches projet)                                      | ✅ Couvert | OK                                           |
| 7     | **RFC-PROJ-006** | Risks Backend       | Gestion risques (probabilité, impact)                                  | ✅ Couvert | OK                                           |
| 8     | **RFC-PROJ-008** | Permissions         | RBAC projet (`projects.*`)                                             | ✅ Couvert | OK                                           |
| 9     | **RFC-PROJ-009** | Audit Logs Projet   | Traçabilité actions projet (create/update/delete)                      | ✅ Couvert | backend — actions granulaires                |
| 10    | **RFC-PROJ-013** | Points projet COPIL/COPRO | Historique comités, snapshot à la finalisation, actions/décisions | ✅ Couvert | `ProjectReview*` + `/api/projects/:projectId/reviews` + onglet détail |

---

## 📄 BACKEND — FICHE PROJET DÉCISIONNELLE

| Ordre | RFC              | Nom                    | Description                                                           | État      | Commentaire                                 |
| ----- | ---------------- | ---------------------- | --------------------------------------------------------------------- | --------- | ------------------------------------------- |
| 10    | **RFC-PROJ-012** | Project Sheet          | Objet décisionnel lié au projet                                       | 🟡 En cours | modèle `Project` étendu en base (fiche + arbitrage) |
| 11    | **RFC-PROJ-012** | Project Sheet API      | `GET /api/projects/:id/project-sheet`, `PATCH` même route, `POST …/arbitration` (legacy) | 🟡 En cours | permissions `projects.read` / `projects.update` |
| 12    | **RFC-PROJ-012** | Project Sheet Metrics  | Calcul backend : coût total, budget, forecast, resource cost, ROI     | ❌ À faire | ROI / priorité fiche OK ; agrégats portefeuille à compléter |
| 13    | **RFC-PROJ-012** | Project Decision Rules | Règles d’arbitrage : APPROVED / REJECTED / ON_HOLD / TO_VALIDATE      | ❌ À faire | cohérence partielle (3 niveaux + legacy) ; garde-fous métier à cadrer |

### Contenu attendu de la fiche projet

La fiche projet doit consolider au minimum :

* données d’identité projet
* sponsor
* business owner
* priorité
* alignement stratégique
* valeur attendue
* coût estimé
* budget lié
* charge ressources
* score de risque
* score de complexité
* statut de décision

### Champs métier minimum

* `projectId`
* `clientId`
* `businessOwner`
* `sponsor`
* `priority` = `LOW | MEDIUM | HIGH | CRITICAL`
* `strategicAlignment` = score `0–100`
* `expectedValue`
* `estimatedCost`
* `roi`
* `riskScore`
* `complexityScore`
* `statusDecision` = `IDEA | TO_VALIDATE | APPROVED | REJECTED | ON_HOLD`

### Calculs backend obligatoires

* `totalBudget` = somme des lignes budgétaires liées au projet
* `totalCommitted`
* `totalConsumed`
* `totalForecast`
* `resourceCost` = somme des affectations ressources valorisées
* `estimatedCost` = budget projet + coût ressources
* `roi` = `(expectedValue - estimatedCost) / estimatedCost`

### Règles métier critiques

* une fiche projet doit exister pour tout projet actif
* impossible de passer un projet en `APPROVED` sans :

  * `expectedValue`
  * `estimatedCost`
* verrouillage décisionnel si projet `CLOSED`
* toute donnée reste strictement scopée `clientId`

### Audit logs à ajouter

* `project.sheet.updated`
* `project.decision.changed`

---

## 🔗 BACKEND — LIENS CRITIQUES

| Ordre | RFC              | Nom                | Description                                    | État       | Commentaire                                |
| ----- | ---------------- | ------------------ | ---------------------------------------------- | ---------- | ------------------------------------------ |
| 14    | **RFC-PROJ-010** | Project ↔ Budget   | Lier projets aux lignes/enveloppes budgétaires | ✅ Couvert  | MVP `project-budget` + base fiche projet   |
| 15    | **RFC-PROJ-011** | Tâches, activités, jalons, Gantt backend | Tâches structurées, `ProjectActivity`, jalons enrichis, `GET …/gantt` | ✅ Couvert | [RFC-PROJ-011](RFC-PROJ-011%20%E2%80%94%20T%C3%A2ches%20%20activit%C3%A9s%20jalons%20et%20base%20Gantt.md) ; isolation client ; **UI Gantt** : [RFC-PROJ-012 — Gantt](RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md) (frise interactive ; **≠** [Project Sheet](RFC-PROJ-012%20%E2%80%94%20Project%20Sheet.md)) |
| 16    | **RFC-PROJ-010** | Project Budget KPI | Exposer les KPI budget projet pour la fiche    | ⚠️ Partiel | nécessaire pour coût projet / dérive / ROI |
| —     | *(future)*       | Project ↔ Supplier | Lier projets aux fournisseurs                  | ❌ À faire  | RFC à numéroter — **ne pas confondre** avec RFC-PROJ-011 |

---

## 👥 BACKEND — RESSOURCES

| Ordre | RFC             | Nom                 | Description                                  | État      | Commentaire                         |
| ----- | --------------- | ------------------- | -------------------------------------------- | --------- | ----------------------------------- |
| 17    | **RFC-RES-001** | Resource Registry   | Catalogue ressources (collaborateurs, rôles) | ❌ À faire | fondation staffing                  |
| 18    | **RFC-RES-002** | Resource Assignment | Affectation ressources aux projets (charge)  | ❌ À faire | indispensable pour coût projet réel |
| 19    | **RFC-RES-002** | Resource Costing    | Valorisation charge / coût ressource         | ❌ À faire | dépend fiche projet et arbitrage    |

---

## 🖥️ FRONTEND — PROJET

| Ordre | RFC                 | Nom               | Description                                    | État       | Commentaire                      |
| ----- | ------------------- | ----------------- | ---------------------------------------------- | ---------- | -------------------------------- |
| 20    | **RFC-FE-PROJ-001** | Portfolio List UI | Vue globale projets (liste + filtres + statut) | ✅ Couvert  | `/projects`                      |
| 21    | **RFC-FE-PROJ-002** | Project Detail UI | Cockpit projet (vue détaillée)                 | ✅ Couvert  | OK                               |
| 22    | **RFC-FE-PROJ-014** | Project Sheet UI  | Fiche projet décisionnelle pour arbitrer       | ❌ À faire  | **urgence absolue**              |
| 23    | **RFC-FE-PROJ-003** | Tasks UI          | Interface gestion tâches                       | ✅ Couvert  | stable                           |
| 23a   | **RFC-PROJ-012**    | Gantt UI (planning) | Grille + frise ; barres / jalons déplaçables, liens FS, SVG    | ✅ Couvert  | [RFC-PROJ-012 — Gantt](RFC-PROJ-012%20%E2%80%94%20Gantt%20T%C3%A2ches%20et%20Jalons.md) — **ne pas confondre** avec RFC-PROJ-012 Project Sheet |
| 24    | **RFC-FE-PROJ-004** | Risks UI          | Interface gestion risques                      | ✅ Couvert  | stable                           |
| 25    | **RFC-FE-PROJ-005** | Resources UI      | Vue ressources projet + affectations           | ❌ À faire  | dépend RES                       |
| 26    | **RFC-FE-PROJ-006** | Budget Links UI   | Visualiser budgets liés au projet              | ⚠️ Partiel | section Budget sur détail projet |
| 27    | **RFC-FE-PROJ-007** | Supplier Links UI | Visualiser fournisseurs liés                   | ❌ À faire  | dépend future RFC projet ↔ fournisseur |
| 28    | **RFC-FE-PROJ-011** | Project Health UI | Indicateurs santé projet (badges, score)       | ✅ Couvert  | OK                               |

### Contenu attendu côté UI — Fiche Projet

La fiche projet doit afficher :

* sponsor
* business owner
* priorité
* score de risque
* score de complexité
* coût budgétaire
* coût ressources
* coût total
* valeur attendue
* ROI
* décision actuelle

### Actions attendues

* approuver
* rejeter
* mettre en attente
* repasser en validation

---

# ⚙️ PHASE 2 — BUDGET PRÉVISIONNEL

## 🧱 BACKEND — FORECAST

| Ordre | RFC         | Nom                   | Description                                   | État       | Commentaire   |
| ----- | ----------- | --------------------- | --------------------------------------------- | ---------- | ------------- |
| 29    | **RFC-024** | Monthly Planning      | Stockage + calcul planning mensuel (12 mois)  | ❌ À faire  | cœur forecast |
| 30    | **RFC-019** | Budget Versioning     | Gestion versions budget (baseline, révisions) | ⚠️ Partiel | à connecter   |
| 31    | **RFC-016** | Budget Reporting      | KPI consolidés (exercice, budget, enveloppe)  | ✅ Terminé  | API prête     |
| 32    | **RFC-017** | Budget Reallocation   | Transfert budget entre lignes                 | ✅ Terminé  | OK            |
| 33    | **RFC-021** | Analytical Dimensions | Centres de coûts + ventilation analytique     | ❌ À faire  | critique DAF  |

---

## 🖥️ FRONTEND — FORECAST CORE

| Ordre | RFC            | Nom                   | Description                                         | État       | Commentaire    |
| ----- | -------------- | --------------------- | --------------------------------------------------- | ---------- | -------------- |
| 34    | **RFC-FE-005** | Budget Line Detail    | Vue détaillée ligne (montants, events, allocations) | ⚠️ Partiel | à finir        |
| 35    | **RFC-FE-029** | Monthly Planning Grid | Grille de saisie mensuelle (12 mois)                | ❌ À faire  | dépend RFC-024 |
| 36    | **RFC-FE-030** | Cell Calculation UI   | Explication calcul des montants                     | ❌ À faire  | UX clé         |
| 37    | **RFC-FE-031** | Calculator UI         | Outil calcul (quantité × prix, etc.)                | ❌ À faire  | productivité   |

---

## 🧠 FRONTEND — PILOTAGE

| Ordre | RFC            | Nom                   | Description                               | État       | Commentaire |
| ----- | -------------- | --------------------- | ----------------------------------------- | ---------- | ----------- |
| 38    | **RFC-FE-002** | Budget Dashboard      | Cockpit global financier (KPI, tendances) | ⚠️ Partiel | à enrichir  |
| 39    | **RFC-FE-032** | Envelope Monthly View | Vue mensuelle par enveloppe               | ❌ À faire  |             |
| 40    | **RFC-FE-033** | Landing Forecast      | Projection fin d’année (atterrissage)     | ❌ À faire  |             |
| 41    | **RFC-FE-034** | Landing Target        | Comparaison cible vs forecast             | ❌ À faire  |             |
| 42    | **RFC-FE-035** | Landing Allocation    | Répartition automatique budget            | ❌ À faire  |             |
| 43    | **RFC-FE-027** | Alerts & Integrity    | Alertes dépassement / incohérences        | ❌ À faire  | sécurité    |

---

# 🔗 PHASE 3 — FUSION PROJET + BUDGET

| Ordre | RFC                 | Nom                 | Description                      | État |
| ----- | ------------------- | ------------------- | -------------------------------- | ---- |
| 44    | **RFC-FE-PROJ-008** | Portfolio Cockpit   | Vue consolidée projets + budgets | ❌    |
| 45    | **RFC-FE-PROJ-012** | Project vs Budget   | Analyse dérive coût projet       | ❌    |
| 46    | **RFC-FE-036**      | Forecast vs Landing | Analyse écart financier          | ❌    |
| 47    | **RFC-FE-PROJ-013** | Project Insights    | Détection projets en dérive      | ❌    |
| 48    | **RFC-FE-PROJ-015** | Resource Load View  | Charge équipes / capacité        | ❌    |

---

# 🚨 SYNTHÈSE ACTIONNABLE

## 🔥 À FAIRE MAINTENANT (CRITIQUE)

| RFC                     | Pourquoi                                                   |
| ----------------------- | ---------------------------------------------------------- |
| **RFC-PROJ-012**        | **fiche projet décisionnelle** indispensable pour arbitrer |
| **RFC-FE-PROJ-014**     | UI d’arbitrage CODIR / DAF / DSI                           |
| **RFC-PROJ-010 suite**  | alimenter la fiche avec les KPI budget projet              |
| **RFC-RES-001 / 002**   | calcul charge / coût ressources                            |
| *(future RFC)*          | vue transverse projet / fournisseurs (pas RFC-PROJ-011)    |
| **RFC-FE-PROJ-005/007** | cockpit ressources / fournisseurs                          |

---

## ⚙️ ENSUITE

| RFC                 | Pourquoi                   |
| ------------------- | -------------------------- |
| **RFC-024**         | moteur forecast            |
| **FE-029 → 031**    | UX différenciante          |
| **RFC-021**         | lecture analytique DAF     |
| **RFC-FE-PROJ-012** | analyse dérive coût projet |

---

# ✅ DÉCISION DE PRIORISATION

Avant d’aller plus loin sur le forecast avancé, il faut **absolument** ajouter la **fiche projet**.

Pourquoi :

* sans fiche projet, tu suis des projets
* avec fiche projet, tu peux **arbitrer**, **prioriser**, **valider**, **geler**, **rejeter**

Autrement dit :

> le module Projet devient un vrai outil de décision, pas seulement un outil de suivi

Je peux maintenant te rédiger la **RFC-PROJ-012 — Fiche Projet Décisionnelle** proprement.
