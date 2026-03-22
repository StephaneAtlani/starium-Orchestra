Parfait — je te structure le **plan de déploiement avec les RFC associées**, aligné avec ta roadmap frontend.

---

# 🧭 PLAN DE DÉPLOIEMENT — AVEC RFC

---

# 🚀 PHASE 1 — PLANNING MENSUEL (FONDATION)

## 🎯 Objectif

Construire le budget mensuel sur les lignes

## RFC Backend

* **RFC-024** → Budget Forecast Grid (modèle + règles)

## RFC Frontend

* **RFC-FE-029** → Budget Line Monthly Planning Grid UI

## Livrables

* grille 12 mois
* édition inline
* total automatique

## Impact

🔥 Remplacement Excel
🔥 Base du produit

---

# 🚀 PHASE 2 — CELLULE INTELLIGENTE

## 🎯 Objectif

Expliquer les montants

## RFC Backend

* **RFC-024 (extension)** → Calculation engine (déjà inclus)
* (optionnel) RFC dédiée si tu veux découper :
  → **RFC-025** Calculation Engine

## RFC Frontend

* **RFC-FE-030** → Cell Calculation UI
* **RFC-FE-031** → Cell Calculator & Apply UX

## Livrables

* lignes de calcul nommées
* calculette
* apply scope

## Impact

🔥 Crédibilité DAF
🔥 Explicabilité

---

# 🚀 PHASE 3 — ENVELOPPE + ATTERRISSAGE

## 🎯 Objectif

Piloter au niveau macro

## RFC Backend

* **RFC-024 (agrégation)** → Envelope monthly
* **RFC-029** → Landing Forecast Engine

## RFC Frontend

* **RFC-FE-032** → Budget Envelope Monthly View UI
* **RFC-FE-033** → Landing Forecast UI

## Livrables

* vue enveloppe mensuelle
* atterrissage ligne + enveloppe

## Impact

🔥 Vision DG
🔥 Pilotage réel

---

# 🚀 PHASE 4 — CADRAGE DG / DAF

## 🎯 Objectif

Permettre la décision top-down

## RFC Backend

* **RFC-030** → Envelope Landing Target

## RFC Frontend

* **RFC-FE-034** → Envelope Landing Target UI

## Livrables

* saisie cible enveloppe
* statut (draft / validé)

## Impact

🔥 Gouvernance
🔥 Alignement direction

---

# 🚀 PHASE 5 — DÉVERSEMENT (CRITIQUE PRODUIT)

## 🎯 Objectif

Transformer la décision en action

## RFC Backend

* **RFC-031** → Landing Allocation Engine

## RFC Frontend

* **RFC-FE-035** → Landing Allocation UI

## Livrables

* bouton “déverser”
* simulation
* validation
* redistribution sur lignes

## Impact

🚀 Différenciation produit
🚀 Pilotage stratégique

---

# 📊 VUE SYNTHÉTIQUE

| Phase | Objectif             | Backend RFC       | Frontend RFC     |
| ----- | -------------------- | ----------------- | ---------------- |
| **1** | Planning mensuel     | RFC-024           | RFC-FE-029       |
| **2** | Cellule intelligente | RFC-024 / RFC-025 | RFC-FE-030 / 031 |
| **3** | Enveloppe + landing  | RFC-024 / RFC-029 | RFC-FE-032 / 033 |
| **4** | Cadrage DG/DAF       | RFC-030           | RFC-FE-034       |
| **5** | Déversement          | RFC-031           | RFC-FE-035       |

---

# 🎯 PRIORITÉ ABSOLUE (si tu veux aller vite)

## 🔥 Bloc 1

* RFC-024
* RFC-FE-029

## 🔥 Bloc 2

* RFC-FE-030
* RFC-FE-031

## 🔥 Bloc 3

* RFC-029
* RFC-FE-033

👉 Avec ça, tu as déjà un produit très solide
