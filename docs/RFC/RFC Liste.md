Parfait — je t’intègre ça proprement dans ta roadmap **sans casser ta logique actuelle**, mais en injectant les briques critiques “forecast / atterrissage”.

👉 Je fais 2 choses :

1. **ajout des RFC nécessaires**
2. **repositionnement en priorité HAUTE là où c’est critique produit**

---

# 🧭 ROADMAP FRONTEND — VERSION FINALE PRIORISÉE (AVEC FORECAST)

---

## 🔥 NIVEAU 1 — PRODUIT UTILISABLE (CRITIQUE)

👉 On ajoute ici **le planning mensuel + cellule intelligente**, sinon ton produit n’est pas différenciant.

| Ordre | RFC                    | Nom                                      | Objectif                     | Résultat concret                              | Priorité | État    |
| ----- | ---------------------- | ---------------------------------------- | ---------------------------- | --------------------------------------------- | -------- | ------- |
| **1** | **RFC-FE-005**         | Budget Line Detail UI                    | Comprendre une ligne         | Page `/budget-lines/[id]` complète            | 🔥🔥🔥   | À faire |
| **2** | **RFC-FE-ADD-006**     | Budget Line Intelligence Drawer UI       | Agir rapidement              | Drawer opérationnel                           | 🔥🔥🔥   | ✅       |
| **3** | **RFC-FE-029** *(NEW)* | **Budget Line Monthly Planning Grid UI** | Construire le budget mensuel | Grille 12 mois, inline edit, drag fill        | 🔥🔥🔥   | À créer |
| **4** | **RFC-FE-030** *(NEW)* | **Cell Calculation UI**                  | Expliquer les montants       | Popover + drawer + lignes de calcul nommées   | 🔥🔥🔥   | À créer |
| **5** | **RFC-FE-031** *(NEW)* | **Cell Calculator & Apply UX**           | Accélérer la saisie          | Calculette + apply (mois / trimestre / année) | 🔥🔥🔥   | À créer |
| **6** | **RFC-FE-025**         | Procurement Management UI                | Gérer achats                 | Pages `/procurement`                          | 🔥🔥🔥   | À créer |
| **7** | **RFC-FE-028**         | Supplier UX                              | UX fournisseur               | Autocomplete + quick-create                   | 🔥🔥🔥   | ✅       |
| **8** | **RFC-FE-026**         | Financial Events Timeline                | Comprendre impacts           | Timeline dans drawer                          | 🔥🔥🔥   | ✅       |

---

# ⚙️ NIVEAU 2 — PILOTAGE & CRÉDIBILITÉ

👉 Ici on ajoute **l’atterrissage + pilotage enveloppe (ton besoin DG/DAF)**

| Ordre  | RFC                    | Nom                                     | Objectif                | Résultat concret                          |
| ------ | ---------------------- | --------------------------------------- | ----------------------- | ----------------------------------------- |
| **9**  | **RFC-FE-002**         | Budget Dashboard UI                     | Vision DG               | KPI + drill-down                          |
| **10** | **RFC-FE-032** *(NEW)* | **Budget Envelope Monthly View UI**     | Pilotage enveloppe      | Grille mensuelle agrégée                  |
| **11** | **RFC-FE-033** *(NEW)* | **Landing Forecast UI**                 | Visualiser atterrissage | Affichage atterrissage ligne + enveloppe  |
| **12** | **RFC-FE-034** *(NEW)* | **Envelope Landing Target UI**          | Saisie DG/DAF           | Champ cible enveloppe + statut            |
| **13** | **RFC-FE-035** *(NEW)* | **Landing Allocation UI (Déversement)** | Redistribuer cible      | Simulation + bouton “déverser sur lignes” |
| **14** | **RFC-FE-027**         | Budget Alerts & Integrity               | Sécuriser budgets       | Alertes + badges                          |
| **15** | **RFC-FE-013**         | Permissions & Navigation UX             | RBAC UI                 | Menus dynamiques                          |
| **16** | **RFC-FE-014**         | UX States                               | Uniformisation UX       | loading / error                           |

---

# 📊 NIVEAU 3 — ANALYSE & VALORISATION

👉 Ici on exploite toute la puissance du forecast

| Ordre  | RFC                    | Nom                                 | Objectif          | Résultat                                |
| ------ | ---------------------- | ----------------------------------- | ----------------- | --------------------------------------- |
| **17** | **RFC-FE-010**         | Budget Reporting Views UI           | Analyse           | Vues synthétiques                       |
| **18** | **RFC-FE-012**         | Charts & Visual Analytics           | Visualisation     | Graphiques                              |
| **19** | **RFC-FE-036** *(NEW)* | **Forecast vs Landing Analysis UI** | Comprendre écarts | Comparaison forecast / landing / budget |

---

# 🧱 NIVEAU 4 — AVANCÉ / NON BLOQUANT

| Ordre  | RFC        | Nom                    |
| ------ | ---------- | ---------------------- |
| **20** | RFC-FE-007 | Snapshots              |
| **21** | RFC-FE-008 | Versioning             |
| **22** | RFC-FE-009 | Import                 |
| **23** | RFC-FE-011 | Dimensions analytiques |
