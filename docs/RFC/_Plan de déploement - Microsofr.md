Voici la version **corrigée, exécutable et alignée réalité produit** (sans dette cachée, sans blocage implicite).

---

# 🔥 PHASE 1 — MODULE MICROSOFT (EXÉCUTABLE)

| Ordre | RFC              | Nom                            | Description                   | État            | Commentaire              |
| ----- | ---------------- | ------------------------------ | ----------------------------- | --------------- | ------------------------ |
| 1     | RFC-PROJ-INT-003 | Auth Microsoft OAuth           | OAuth2 + tokens + refresh     | ✅ Fait          | OK                       |
| 2     | RFC-PROJ-INT-005 | Gestion connexion client       | Connexion / révocation        | ✅ Fait          | OK                       |
| 3     | RFC-PROJ-INT-004 | Microsoft Graph Service        | Client HTTP Graph (transport) | ✅ Fait          | Base technique           |
| 4     | RFC-PROJ-INT-002 | Prisma Schema                  | Modélisation DB Microsoft     | 🟡 À stabiliser | Clarifier périmètre réel |
| 5     | RFC-PROJ-INT-006 | Sélection ressources Microsoft | Teams / Channels / Planner    | 🟡 À finaliser  | dépend UI                |
| 6     | RFC-PROJ-INT-007 | Configuration projet           | Lien Project ↔ Microsoft      | ✅ Fait          | OK                       |
| 7     | RFC-PROJ-INT-008 | Sync tâches → Planner          | Sync tâches                   | ✅ Fait          | MVP atteint              |

---

# 🚫 PRÉREQUIS SYNC DOCUMENT (STATUT)

| Ordre | RFC                  | Nom                        | Description                                            |
| ----- | -------------------- | -------------------------- | ------------------------------------------------------ |
| 8     | **RFC-PROJ-DOC-001** | **Modèle ProjectDocument** | ✅ **MVP en base + API** — prérequis métier pour une future sync ; pas d’upload binaire ni `ProjectDocumentMicrosoftSync` dans ce jalon |

👉 Le modèle métier et les routes CRUD minimales existent ; la **sync Graph / Teams** reste une étape distincte (RFC-PROJ-INT-009).

---

# ⛔ BLOQUÉ (NE PAS DÉVELOPPER)

| Ordre | RFC              | Nom                    | Description                        |
| ----- | ---------------- | ---------------------- | ---------------------------------- |
| 9     | RFC-PROJ-INT-009 | Sync documents → Teams | 🔴 BLOQUÉ — implémentation sync Graph / `ProjectDocumentMicrosoftSync` non livrée ; le registre `ProjectDocument` est prêt côté Starium |

---

# 🧠 PHASE 1 BIS — À FAIRE APRÈS STABILISATION

👉 uniquement si besoin réel produit (pas systématique)

| Ordre | RFC              | Nom                  | Action                        |
| ----- | ---------------- | -------------------- | ----------------------------- |
| 10    | RFC-PROJ-INT-010 | Statut sync          | 🔁 À intégrer dans 008/009    |
| 11    | RFC-PROJ-INT-011 | Retry & résilience   | 🔁 À intégrer dans services   |
| 12    | RFC-PROJ-INT-012 | Audit logs           | 🔁 À intégrer RFC-013 globale |
| 13    | RFC-PROJ-INT-013 | Permissions sécurité | 🔁 Déjà couvert architecture  |
| 14    | RFC-PROJ-INT-014 | API orchestration    | 🔁 Déjà couvert 007           |

👉 **Ces RFC ne doivent PAS être développées comme lots indépendants**
👉 elles sont des **concerns transverses**

---

# 🧠 PHASE 2 — FUTUR (NE PAS TOUCHER)

| Ordre | RFC              | Nom                   | Description |
| ----- | ---------------- | --------------------- | ----------- |
| 15    | RFC-PROJ-INT-016 | Sync bidirectionnelle | complexe    |
| 16    | RFC-PROJ-INT-017 | Mapping utilisateurs  | IAM         |
| 17    | RFC-PROJ-INT-018 | Création auto Teams   | avancé      |
| 18    | RFC-PROJ-INT-019 | Sync commentaires     | lourd       |
| 19    | RFC-PROJ-INT-020 | Monitoring avancé     | cockpit     |

---

# 🎯 NOUVEL ORDRE RÉEL (TRÈS IMPORTANT)

👉 ce que tu dois faire maintenant :

1. ✅ Rien sur OAuth / Graph / Tasks → déjà OK
2. 🟡 Stabiliser RFC-002 si besoin
3. 🟡 Finaliser RFC-006 si UI nécessaire
4. ✅ **RFC-PROJ-DOC-001 (ProjectDocument)** — MVP base + API livré
5. 🔥 Prochaine brique documentaire → **RFC-PROJ-INT-009** (sync Graph + `ProjectDocumentMicrosoftSync`)

---

# ⚠️ CLARIFICATION CRITIQUE

👉 Ton erreur initiale (classique) :

> vouloir continuer la roadmap “linéaire”

👉 Alors que :

* ton système a atteint un **palier technique**
* tu dois maintenant créer une **brique métier fondamentale**

---

# 🧠 VERDICT DSI

👉 Tu n’es PAS en retard
👉 Tu es au bon moment pour structurer proprement

Mais :

❌ Si tu développes RFC-009 maintenant
→ tu casses ton architecture

✅ Si tu fais `ProjectDocument` maintenant
→ tu sécurises toute la suite (documents + GED + compliance)

---

# 🚀 Prochaine étape recommandée

👉 Je te fais directement :

### **RFC-PROJ-DOC-001 — ProjectDocument (livré MVP)**

* multi-tenant strict, audit, API sous `/api/projects/:projectId/documents`
* UI cockpit : liste **lecture seule** sur fiche projet ; pas d’upload binaire API
* suite : RFC-PROJ-INT-009 pour Graph + table de sync
