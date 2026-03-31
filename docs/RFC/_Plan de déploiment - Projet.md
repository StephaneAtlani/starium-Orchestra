# 📊 État réel — Module Projets (ce qu’il reste à faire)

| RFC             | Nom                         | Description                                                         | État      |
| --------------- | --------------------------- | ------------------------------------------------------------------- | --------- |
| RFC-PROJ-010    | Budget Links                | Lier `Project` ↔ Budget / Envelope / Line sans dupliquer la finance | ❌ À faire |
| RFC-PROJ-011    | Supplier Links              | Lier projets aux fournisseurs / contrats / commandes                | ❌ À faire |
| RFC-PROJ-012    | Documents & Attachments     | Attacher documents (cadrage, CR, specs, etc.)                       | ❌ À faire |
| RFC-RES-002     | Resource Assignment Backend | Affecter des ressources aux projets (allocation, période, rôle)     | ❌ À faire |
| RFC-RES-003     | Resource Metadata avancé    | Typage avancé ressources (interne/externe/licence/matériel)         | ❌ À faire |
| RFC-FE-PROJ-005 | Resources Tab UI            | Onglet ressources dans la fiche projet                              | ❌ À faire |
| RFC-FE-PROJ-006 | Budget Links Tab UI         | Onglet budget avec navigation vers module budget                    | ❌ À faire |
| RFC-FE-PROJ-007 | Supplier Links Tab UI       | Onglet fournisseurs                                                 | ❌ À faire |
| RFC-PROJ-014    | Alerts & Integrity Rules    | Moteur d’alertes projet (retard, risque critique, incohérences)     | ❌ À faire |

---

# 🧠 Ce qui est **partiellement couvert mais incomplet**

| RFC             | Nom                     | Description                                                         | État       |
| --------------- | ----------------------- | ------------------------------------------------------------------- | ---------- |
| RFC-PROJ-013    | Portfolio Dashboard API | KPI OK mais pas encore exploités pleinement (alertes, priorisation) | ⚠️ Partiel |
| RFC-FE-PROJ-008 | Portfolio Cockpit UI    | Cockpit présent mais pas “DG-ready” (pas assez orienté décision)    | ⚠️ Partiel |

---

# ⚠️ Ce qui est **techniquement fait mais produit non fini**

| Domaine | Problème réel                                             |
| ------- | --------------------------------------------------------- |
| Projets | Très bon CRUD + pilotage (tâches, risques, jalons)        |
| MAIS    | ❌ Pas encore un **cockpit de gouvernance transverse**     |
| Impact  | Le module reste “outil projet” → pas encore “outil CODIR” |

---

# 🔴 Les 3 vrais trous produits (prioritaires)

## 1. 🔗 Absence de transversalité (critique)

* Pas de lien :

  * Budget
  * Fournisseurs
  * Ressources
* Donc :
  👉 impossible de piloter un projet réellement

---

## 2. 🚨 Absence d’intelligence (alerts)

* Pas de :

  * dérive projet
  * incohérence
  * priorisation automatique

👉 Or Starium = cockpit, pas CRUD

---

## 3. 👥 Absence de dimension humaine (ressources)

* Pas de :

  * charge
  * allocation
  * staffing

👉 bloque tout le pilotage DSI

---

# 🧭 Lecture stratégique

Aujourd’hui :

👉 Tu as un **MVP projet solide techniquement**

Mais il manque :

> 🔥 la couche "gouvernance CODIR"

Aligné avec la vision produit :

* cockpit global
* vision transverse
* aide à la décision 

---

# 🎯 Priorisation recommandée (très claire)

## Ordre optimal :

1. **RFC-PROJ-010 (Budget Links)**
   👉 clé pour connecter au core financier

2. **RFC-RES-002 (Resource Assignment)**
   👉 clé pour pilotage réel

3. **RFC-PROJ-014 (Alerts)**
   👉 transforme le module en cockpit

4. **RFC-PROJ-011 (Supplier Links)**
   👉 complète la vision

5. **Frontend tabs (005/006/007)**
   👉 seulement après backend

---

# ⚡ Résumé ultra clair

👉 Ce qui reste à faire n’est **pas du CRUD**

C’est :

* 🔗 connecter les modules
* 🧠 ajouter de l’intelligence
* 👥 intégrer les ressources

👉 Une fois fait :

> Le module projet devient **le cœur du cockpit Starium**
