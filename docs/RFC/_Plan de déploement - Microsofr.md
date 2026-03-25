Voici le **plan propre, exécutable et intégrant explicitement le frontend**, sans ambiguïté ni mélange backend/UI.

---

# 🔥 PHASE 1 — MODULE MICROSOFT (EXÉCUTABLE)

| Ordre | RFC              | Nom                            | Description                | État            | Commentaire        |
| ----- | ---------------- | ------------------------------ | -------------------------- | --------------- | ------------------ |
| 1     | RFC-PROJ-INT-003 | Auth Microsoft OAuth           | OAuth2 + tokens + refresh  | ✅ Fait          | OK                 |
| 2     | RFC-PROJ-INT-005 | Gestion connexion client       | Connexion / révocation     | ✅ Fait          | OK                 |
| 3     | RFC-PROJ-INT-004 | Microsoft Graph Service        | Client HTTP Graph          | ✅ Fait          | Base technique     |
| 4     | RFC-PROJ-INT-002 | Prisma Schema                  | Modélisation DB Microsoft  | 🟡 À stabiliser | Vérifier cohérence |
| 5     | RFC-PROJ-INT-006 | Sélection ressources Microsoft | Teams / Channels / Planner | 🟡 À finaliser  | dépend UI          |
| 6     | RFC-PROJ-INT-007 | Configuration projet           | Lien Project ↔ Microsoft   | ✅ Fait          | OK                 |
| 7     | RFC-PROJ-INT-008 | Sync tâches → Planner          | Sync tâches                | ✅ Fait          | MVP atteint        |

---

# 📄 PHASE 1B — MODULE DOCUMENT (COCKPIT STARIUM)

## Backend (registre documentaire)

| Ordre | RFC              | Nom             | Description                      | État   |
| ----- | ---------------- | --------------- | -------------------------------- | ------ |
| 8     | RFC-PROJ-DOC-001 | ProjectDocument | Modèle + API CRUD (sans fichier) | ✅ Fait |

---

## Frontend (UI cockpit documentaire)

| Ordre | RFC                 | Nom                      | Description                        | État       |
| ----- | ------------------- | ------------------------ | ---------------------------------- | ---------- |
| 9     | RFC-PROJ-DOC-FE-001 | Frontend ProjectDocument | UI lecture seule dans fiche projet | 🔴 À faire |

### Scope frontend MVP (normatif)

* Intégré dans la **fiche projet**
* Pas de page autonome obligatoire
* Affichage :

  * liste/table des documents
  * nom
  * type
  * date
  * auteur (si dispo)

### Hors scope

* upload fichier
* drag & drop
* versioning
* GED avancée

👉 Cette UI est **indépendante de Microsoft**

---

# 🔥 PHASE 2 — SYNC DOCUMENTS MICROSOFT

## Backend

| Ordre | RFC              | Nom                    | Description                               | État       |
| ----- | ---------------- | ---------------------- | ----------------------------------------- | ---------- |
| 10    | RFC-PROJ-INT-009 | Sync documents → Teams | Sync Graph + ProjectDocumentMicrosoftSync | 🔴 À faire |

---

## Frontend

| Ordre | RFC                 | Nom               | Description                | État       |
| ----- | ------------------- | ----------------- | -------------------------- | ---------- |
| 11    | RFC-PROJ-INT-FE-009 | UI Sync Documents | Bouton + statuts + erreurs | 🔴 À faire |

### Scope frontend sync (MVP)

* Bouton : **“Synchroniser vers Teams”**
* Statut par document :

  * Non synchronisé
  * Synchronisé
  * Erreur
* Affichage :

  * lastSyncAt
  * message d’erreur simple

### Règles

* Aucun upload depuis le frontend
* Aucun pilotage avancé
* Pas de retry manuel (MVP)

---

# 🚫 PHASE TRANSVERSE (NE PAS ISOLER EN RFC)

| RFC     | Sujet              | Traitement            |
| ------- | ------------------ | --------------------- |
| RFC-010 | Statuts sync       | Inclus dans 008 / 009 |
| RFC-011 | Retry / résilience | Inclus services       |
| RFC-012 | Audit logs         | RFC-013 global        |
| RFC-013 | Permissions        | Déjà en place         |
| RFC-014 | Orchestration API  | Déjà couvert          |

---

# 🧠 PHASE FUTURE (NE PAS TOUCHER)

| RFC     | Sujet                 |
| ------- | --------------------- |
| RFC-016 | Sync bidirectionnelle |
| RFC-017 | Mapping utilisateurs  |
| RFC-018 | Création auto Teams   |
| RFC-019 | Sync commentaires     |
| RFC-020 | Monitoring avancé     |

---

# 🎯 ORDRE RÉEL D’EXÉCUTION

1. ✅ Microsoft OAuth / Graph / Tasks → terminé
2. 🟡 Stabiliser RFC-002 si nécessaire
3. 🟡 Finaliser RFC-006 (UI sélection Microsoft)
4. ✅ Backend ProjectDocument (fait)
5. 🔴 **Frontend ProjectDocument (DOC-FE-001)**
6. 🔴 **Backend Sync Documents (INT-009)**
7. 🔴 **Frontend Sync Documents (INT-FE-009)**

---

# ⚠️ CLARIFICATION STRATÉGIQUE

👉 Tu as maintenant 2 couches **strictement séparées** :

### 1. Starium (source de vérité)

* ProjectDocument
* UI cockpit
* logique métier

### 2. Microsoft (projection)

* Planner (déjà fait)
* Documents (RFC-009)
* pure extension

---

# 🧠 VERDICT

✅ Plan maintenant **exécutable sans ambiguïté**
✅ Backend / Frontend correctement découplés
✅ Zéro dépendance cachée
✅ Compatible avec ton architecture multi-tenant + cockpit
