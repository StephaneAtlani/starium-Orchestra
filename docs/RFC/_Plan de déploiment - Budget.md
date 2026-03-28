# 🧭 PLAN DE DÉVELOPPEMENT — MODULE BUDGET

| Phase  | Désignation                                | Objectif métier                                                    | Backend RFC                           | Frontend RFC               | État                    |
| ------ | ------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------- | -------------------------- | ----------------------- |
| **0**  | **Cockpit Budget & Dashboard**             | Donner une vision DG/DAF exploitable immédiatement (KPI + alertes) | RFC-022 + RFC-016 (extension alertes) | Budget Dashboard UI        | ❌ À faire               |
| **1**  | **Planning budgétaire mensuel**            | Remplacer Excel par une planification 12 mois                      | RFC-024                               | RFC-FE-029                 | ❌ À faire               |
| **2**  | **Cellule intelligente & calculs**         | Expliquer les montants (logique DAF)                               | RFC-024 (calc engine) / RFC-025       | RFC-FE-030 / 031           | ❌ À faire               |
| **3**  | **Vue enveloppe & atterrissage**           | Pilotage macro + forecast réel                                     | RFC-024 (agg) + RFC-029               | RFC-FE-032 / 033           | ❌ À faire               |
| **4**  | **Workflow budgétaire (gouvernance)**      | Validation DAF / DG + budget officiel                              | RFC Budget Workflow (nouveau)         | UI validation budget       | ❌ À faire               |
| **5**  | **Déversement & allocation stratégique**   | Transformer décisions en répartition réelle                        | RFC-031                               | RFC-FE-035                 | ❌ À faire               |
| **6**  | **Alerting & contrôle budgétaire**         | Détecter dérives et anomalies                                      | RFC-016 (rules alertes)               | Alert UI / badges          | ❌ À faire               |
| **7**  | **Versioning & snapshots exploitable**     | Historique, comparaison, audit                                     | RFC-019 + RFC-015-3                   | UI versioning / compare    | ⚠️ Backend OK / Front ❌ |
| **8**  | **Axes analytiques (DAF-ready)**           | Lecture comptable et analytique                                    | RFC-021                               | UI dimensions analytiques  | ❌ À faire               |
| **9**  | **Intégration procurement**                | Lier budget au réel (PO / factures)                                | RFC-025 (procurement)                 | Supplier / PO / Invoice UI | ⚠️ Partiel              |
| **10** | **Import / Export & interop**              | Intégration ERP / Excel                                            | RFC-018                               | UI import                  | ⚠️ Backend OK / Front ❌ |
| **11** | **Vue multi-client (DSI à temps partagé)** | Pilotage transversal                                               | Extension reporting                   | Global cockpit UI          | ❌ À faire               |

---

# 📊 Lecture rapide de l’état

### ✅ Solide (backend prêt)

* Structure budget (RFC-015-2) 
* Financial core
* Reporting API (RFC-016)
* Import (RFC-018)
* Versioning / snapshots

---

### ⚠️ Partiel (déséquilibré)

* Procurement (pas encore intégré UX)
* Versioning (pas exploitable métier)
* Import (pas utilisable UI)

---

### ❌ Critique (manquant)

* Dashboard cockpit
* Planning mensuel
* Workflow
* Alerting
* UX globale

---

# 🎯 Priorité réelle (ordre recommandé)

| Priorité | Phase                      |
| -------- | -------------------------- |
| 🔥 1     | Cockpit Budget & Dashboard |
| 🔥 2     | Planning mensuel           |
| 🔥 3     | Cellule intelligente       |
| 🔥 4     | Vue enveloppe & landing    |
| 🔥 5     | Workflow                   |
| 🔥 6     | Déversement                |

---

# 🧠 Conclusion

👉 Ton backend est déjà **très avancé**
👉 Ton produit est encore **invisible côté métier**

Ce tableau te donne :

* une vision **pilotable**
* une roadmap **vendable**
* une base **alignée DG / DAF**

