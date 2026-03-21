# 🔥 PHASE 1 — MODULE PROJET (PRIORITÉ ABSOLUE)

## 🧱 BACKEND — PROJET

| Ordre | RFC              | Nom                 | Description                                                     | État       | Commentaire        |
| ----- | ---------------- | ------------------- | --------------------------------------------------------------- | ---------- | ------------------ |
| 1     | **RFC-PROJ-001** | Cadrage fonctionnel | Définition du périmètre projet (projet, tâche, risque, cockpit) | ✅ Couvert  | Base MVP OK        |
| 2     | **RFC-PROJ-002** | Prisma Schema       | Modélisation DB : Project, Task, Risk, Milestone                | ✅ Couvert  | Structure OK       |
| 3     | **RFC-PROJ-003** | Règles métier       | Calcul health, statuts, cohérence projet                        | ✅ Couvert  | Service existant   |
| 4     | **RFC-PROJ-004** | Portfolio API       | CRUD projets + agrégats portefeuille                            | ✅ Couvert  | `/api/projects` OK |
| 5     | **RFC-PROJ-005** | Tasks Backend       | Gestion exécution (tâches projet)                               | ✅ Couvert  | OK                 |
| 6     | **RFC-PROJ-006** | Risks Backend       | Gestion risques (probabilité, impact)                           | ✅ Couvert  | OK                 |
| 7     | **RFC-PROJ-008** | Permissions         | RBAC projet (`projects.*`)                                      | ✅ Couvert  | OK                 |
| 8     | **RFC-PROJ-009** | Audit Logs Projet   | Traçabilité actions projet (create/update/delete)               | ⚠️ Partiel | manque granularité |

---

## 🔗 BACKEND — LIENS CRITIQUES

| Ordre | RFC              | Nom                | Description                                    | État      | Commentaire       |
| ----- | ---------------- | ------------------ | ---------------------------------------------- | --------- | ----------------- |
| 9     | **RFC-PROJ-010** | Project ↔ Budget   | Lier projets aux lignes/enveloppes budgétaires | ❌ À faire | critique forecast |
| 10    | **RFC-PROJ-011** | Project ↔ Supplier | Lier projets aux fournisseurs                  | ❌ À faire | vision transverse |

---

## 👥 BACKEND — RESSOURCES

| Ordre | RFC             | Nom                 | Description                                  | État      | Commentaire        |
| ----- | --------------- | ------------------- | -------------------------------------------- | --------- | ------------------ |
| 11    | **RFC-RES-001** | Resource Registry   | Catalogue ressources (collaborateurs, rôles) | ❌ À faire | fondation staffing |
| 12    | **RFC-RES-002** | Resource Assignment | Affectation ressources aux projets (charge)  | ❌ À faire | pilotage équipe    |

---

## 🖥️ FRONTEND — PROJET

| Ordre | RFC                 | Nom               | Description                                    | État      | Commentaire     |
| ----- | ------------------- | ----------------- | ---------------------------------------------- | --------- | --------------- |
| 13    | **RFC-FE-PROJ-001** | Portfolio List UI | Vue globale projets (liste + filtres + statut) | ✅ Couvert | `/projects`     |
| 14    | **RFC-FE-PROJ-002** | Project Detail UI | Cockpit projet (vue détaillée)                 | ✅ Couvert | OK              |
| 15    | **RFC-FE-PROJ-003** | Tasks UI          | Interface gestion tâches                       | ✅ Couvert | stable          |
| 16    | **RFC-FE-PROJ-004** | Risks UI          | Interface gestion risques                      | ✅ Couvert | stable          |
| 17    | **RFC-FE-PROJ-005** | Resources UI      | Vue ressources projet + affectations           | ❌ À faire | dépend RES      |
| 18    | **RFC-FE-PROJ-006** | Budget Links UI   | Visualiser budgets liés au projet              | ❌ À faire | dépend PROJ-010 |
| 19    | **RFC-FE-PROJ-007** | Supplier Links UI | Visualiser fournisseurs liés                   | ❌ À faire | dépend PROJ-011 |
| 20    | **RFC-FE-PROJ-011** | Project Health UI | Indicateurs santé projet (badges, score)       | ✅ Couvert | OK              |

---

# ⚙️ PHASE 2 — BUDGET PRÉVISIONNEL

## 🧱 BACKEND — FORECAST

| Ordre | RFC         | Nom                   | Description                                   | État       | Commentaire   |
| ----- | ----------- | --------------------- | --------------------------------------------- | ---------- | ------------- |
| 21    | **RFC-024** | Monthly Planning      | Stockage + calcul planning mensuel (12 mois)  | ❌ À faire  | cœur forecast |
| 22    | **RFC-019** | Budget Versioning     | Gestion versions budget (baseline, révisions) | ⚠️ Partiel | à connecter   |
| 23    | **RFC-016** | Budget Reporting      | KPI consolidés (exercice, budget, enveloppe)  | ✅ Terminé  | API prête     |
| 24    | **RFC-017** | Budget Reallocation   | Transfert budget entre lignes                 | ✅ Terminé  | OK            |
| 25    | **RFC-021** | Analytical Dimensions | Centres de coûts + ventilation analytique     | ❌ À faire  | critique DAF  |

---

## 🖥️ FRONTEND — FORECAST CORE

| Ordre | RFC            | Nom                   | Description                                         | État       | Commentaire    |
| ----- | -------------- | --------------------- | --------------------------------------------------- | ---------- | -------------- |
| 26    | **RFC-FE-005** | Budget Line Detail    | Vue détaillée ligne (montants, events, allocations) | ⚠️ Partiel | à finir        |
| 27    | **RFC-FE-029** | Monthly Planning Grid | Grille de saisie mensuelle (12 mois)                | ❌ À faire  | dépend RFC-024 |
| 28    | **RFC-FE-030** | Cell Calculation UI   | Explication calcul des montants                     | ❌ À faire  | UX clé         |
| 29    | **RFC-FE-031** | Calculator UI         | Outil calcul (quantité × prix, etc.)                | ❌ À faire  | productivité   |

---

## 🧠 FRONTEND — PILOTAGE

| Ordre | RFC            | Nom                   | Description                               | État       | Commentaire |
| ----- | -------------- | --------------------- | ----------------------------------------- | ---------- | ----------- |
| 30    | **RFC-FE-002** | Budget Dashboard      | Cockpit global financier (KPI, tendances) | ⚠️ Partiel | à enrichir  |
| 31    | **RFC-FE-032** | Envelope Monthly View | Vue mensuelle par enveloppe               | ❌ À faire  |             |
| 32    | **RFC-FE-033** | Landing Forecast      | Projection fin d’année (atterrissage)     | ❌ À faire  |             |
| 33    | **RFC-FE-034** | Landing Target        | Comparaison cible vs forecast             | ❌ À faire  |             |
| 34    | **RFC-FE-035** | Landing Allocation    | Répartition automatique budget            | ❌ À faire  |             |
| 35    | **RFC-FE-027** | Alerts & Integrity    | Alertes dépassement / incohérences        | ❌ À faire  | sécurité    |

---

# 🔗 PHASE 3 — FUSION PROJET + BUDGET

| Ordre | RFC                 | Nom                 | Description                      | État |
| ----- | ------------------- | ------------------- | -------------------------------- | ---- |
| 36    | **RFC-FE-PROJ-008** | Portfolio Cockpit   | Vue consolidée projets + budgets | ❌    |
| 37    | **RFC-FE-PROJ-012** | Project vs Budget   | Analyse dérive coût projet       | ❌    |
| 38    | **RFC-FE-036**      | Forecast vs Landing | Analyse écart financier          | ❌    |
| 39    | **RFC-FE-PROJ-013** | Project Insights    | Détection projets en dérive      | ❌    |
| 40    | **RFC-FE-PROJ-015** | Resource Load View  | Charge équipes / capacité        | ❌    |

---

# 🚨 SYNTHÈSE ACTIONNABLE

## 🔥 À FAIRE MAINTENANT (CRITIQUE)

| RFC                     | Pourquoi                           |
| ----------------------- | ---------------------------------- |
| **PROJ-010**            | lien projet ↔ budget = clé produit |
| **PROJ-011**            | vision fournisseur                 |
| **RES-001 / 002**       | pilotage équipes                   |
| **FE-PROJ-005/006/007** | cockpit complet                    |

---

## ⚙️ ENSUITE

| RFC              | Pourquoi          |
| ---------------- | ----------------- |
| **RFC-024**      | moteur forecast   |
| **FE-029 → 031** | UX différenciante |

