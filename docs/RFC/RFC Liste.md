# 🧭 ROADMAP FRONTEND — VERSION FINALE PRIORISÉE

## 🔥 NIVEAU 1 — PRODUIT UTILISABLE (CRITIQUE)

| Ordre | RFC                    | Nom                                | Objectif                                   | Résultat concret                                                                                        | Priorité | État          |
| ----- | ---------------------- | ---------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| **1** | **RFC-FE-005**         | Budget Line Detail UI              | Comprendre réellement une ligne budgétaire | Page `/budget-lines/[id]` : KPI, allocations, commitments, invoices, events (lecture complète et audit) | 🔥🔥🔥   | À faire       |
| **2** | **RFC-FE-ADD-006**     | Budget Line Intelligence Drawer UI | Agir rapidement sur une ligne              | Drawer opérationnel + **refacto/mutualisation composants avec FE-005**                                  | 🔥🔥🔥   | ✅ À optimiser |
| **3** | **RFC-FE-025** *(NEW)* | Procurement Management UI          | Gérer fournisseurs / commandes / factures  | Pages `/procurement` : listes, filtres, recherche, navigation                                           | 🔥🔥🔥   | À créer       |
| **4** | **RFC-FE-028** *(NEW)* | Supplier UX                        | UX propre fournisseur                      | Autocomplete, quick-create, anti-doublons                                                               | 🔥🔥🔥   | ✅ Implémentée (v1) |
| **5** | **RFC-FE-026** *(NEW)* | Financial Events Timeline          | Comprendre les impacts financiers          | Timeline claire (PO, invoices, allocations)                                                             | 🔥🔥🔥   | À créer       |

---

## ⚙️ NIVEAU 2 — PILOTAGE & CRÉDIBILITÉ

| Ordre | RFC                    | Nom                         | Objectif                            | Résultat concret                          | Priorité | État    |
| ----- | ---------------------- | --------------------------- | ----------------------------------- | ----------------------------------------- | -------- | ------- |
| **6** | **RFC-FE-002**         | Budget Dashboard UI         | Vision globale DG / CODIR           | Dashboard KPI + alertes + drill-down      | 🔥🔥     | À faire |
| **7** | **RFC-FE-027** *(NEW)* | Budget Alerts & Integrity   | Sécuriser les budgets               | Alertes dépassement, incohérences, badges | 🔥🔥     | À créer |
| **8** | **RFC-FE-013**         | Permissions & Navigation UX | Adapter UI au RBAC                  | Menus dynamiques, actions conditionnelles | 🔥🔥     | À faire |
| **9** | **RFC-FE-014**         | UX States                   | Uniformiser loading / error / empty | UX propre sur tout le module              | 🔥🔥     | À faire |

---

## 📊 NIVEAU 3 — ANALYSE & VALORISATION

| Ordre  | RFC            | Nom                       | Objectif                | Résultat concret               | Priorité | État    |
| ------ | -------------- | ------------------------- | ----------------------- | ------------------------------ | -------- | ------- |
| **10** | **RFC-FE-010** | Budget Reporting Views UI | Exploiter API reporting | Vues synthétiques exploitables | 🔥       | À faire |
| **11** | **RFC-FE-012** | Charts & Visual Analytics | Visualisation graphique | Graphiques interactifs         | 🔥       | À faire |

---

## 🧱 NIVEAU 4 — AVANCÉ / NON BLOQUANT

| Ordre  | RFC            | Nom                      | Objectif            | Résultat concret         | Priorité | État    |
| ------ | -------------- | ------------------------ | ------------------- | ------------------------ | -------- | ------- |
| **12** | **RFC-FE-007** | Budget Snapshots UI      | Exploiter snapshots | Comparaison versions     | 🟡       | À faire |
| **13** | **RFC-FE-008** | Budget Versioning UI     | Gestion versions    | Baselines + historique   | 🟡       | À faire |
| **14** | **RFC-FE-009** | Budget Import UI         | Import Excel avancé | Mapping + preview        | 🟡       | À faire |
| **15** | **RFC-FE-011** | Analytical Dimensions UI | UI analytique       | Gestion axes analytiques | 🟡       | À faire |
