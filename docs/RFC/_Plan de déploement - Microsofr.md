Voici le **plan propre, exécutable et intégrant explicitement le frontend**, sans ambiguïté ni mélange backend/UI.

**Dernière mise à jour :** 2026-03-26 — état aligné sur le dépôt (`apps/api`, `apps/web`) et sur [\_RFC Liste.md](./_RFC%20Liste.md).

---

# PHASE 1 — MODULE MICROSOFT (EXÉCUTABLE)

| Ordre | RFC              | Nom                            | Description                | État           | Commentaire |
| ----- | ---------------- | ------------------------------ | -------------------------- | -------------- | ----------- |
| 1     | RFC-PROJ-INT-003 | Auth Microsoft OAuth           | OAuth2 + tokens + refresh  | Fait           | `apps/api/src/modules/microsoft/` |
| 2     | RFC-PROJ-INT-005 | Gestion connexion client       | Connexion / révocation     | Fait           | API + UI admin client |
| 3     | RFC-PROJ-INT-004 | Microsoft Graph Service        | Client HTTP Graph          | Fait           | Base technique + tests |
| 4     | RFC-PROJ-INT-002 | Prisma Schema                  | Modélisation DB Microsoft  | Partiel        | `MicrosoftConnection` + enums en base ; `ProjectMicrosoftLink` / sync tâches non migrés |
| 5     | RFC-PROJ-INT-006 | Sélection ressources Microsoft | Teams / Channels / Planner | Partiel        | API listing OK ; UI cascade sur fiche projet (`ProjectMicrosoftResourceSelectorsCard`) ; **persistance `PUT /api/projects/:id/microsoft-link` non branchée dans l’UI** (config lien = API ou complétion UI) |
| 6     | RFC-PROJ-INT-007 | Configuration projet           | Lien Project ↔ Microsoft   | Fait           | GET/PUT + garde-fous connexion active |
| 7     | RFC-PROJ-INT-008 | Sync tâches → Planner          | Sync tâches                | Fait           | `POST .../sync-tasks`, mapping `ProjectTaskMicrosoftSync` |
| 8     | RFC-PROJ-INT-016 | Sync bidirectionnelle tâches   | Pull Planner -> Starium + Push Starium -> Planner | Fait           | Endpoint inchangé `POST .../sync-tasks`, conflit `starium-wins`, contrat enrichi + audit dédié |

---

# PHASE 1B — MODULE DOCUMENT (COCKPIT STARIUM)

## Backend (registre documentaire)

| Ordre | RFC              | Nom             | Description                      | État   |
| ----- | ---------------- | --------------- | -------------------------------- | ------ |
| 8     | RFC-PROJ-DOC-001 | ProjectDocument | Modèle + API CRUD (sans fichier) | Fait   |

---

## Frontend (UI cockpit documentaire)

| Ordre | RFC                 | Nom                      | Description                        | État   |
| ----- | ------------------- | ------------------------ | ---------------------------------- | ------ |
| 9     | RFC-PROJ-DOC-FE-001 | Frontend ProjectDocument | UI lecture seule dans fiche projet | Fait   |

### Scope frontend MVP (normatif)

* Intégré dans la **fiche projet** (`ProjectDocumentsSection` — tableau nom, catégorie, stockage, statut, taille, métadonnées).
* Pas de page autonome obligatoire.
* Hors scope inchangé : upload, DnD, versioning, GED avancée.

Cette UI est **indépendante de Microsoft**.

---

# PHASE 2 — SYNC DOCUMENTS MICROSOFT

## Backend

| Ordre | RFC              | Nom                    | Description                               | État   |
| ----- | ---------------- | ---------------------- | ----------------------------------------- | ------ |
| 10    | RFC-PROJ-INT-009 | Sync documents → Teams | Sync Graph + `ProjectDocumentMicrosoftSync` + `POST .../sync-documents` | Fait   |

Lecture fichiers `STARIUM` : racine `PROJECT_DOCUMENTS_STORAGE_ROOT` (voir RFC-009).

---

## Frontend

| Ordre | RFC                 | Nom               | Description                | État    |
| ----- | ------------------- | ----------------- | -------------------------- | ------- |
| 11    | RFC-PROJ-INT-FE-009 | UI Sync Documents | Bouton + statuts + erreurs | À faire |

### Scope frontend sync (MVP)

* Bouton : **« Synchroniser vers Teams »**
* Statut par document : non synchronisé / synchronisé / erreur ; `lastSyncAt` ; message d’erreur simple.
* Règles MVP inchangées : pas d’upload, pas de retry manuel.

---

# PHASE TRANSVERSE (NE PAS ISOLER EN RFC)

| RFC     | Sujet              | Traitement            |
| ------- | ------------------ | --------------------- |
| RFC-010 | Statuts sync       | Inclus dans 008 / 009 |
| RFC-011 | Retry / résilience | Inclus services       |
| RFC-012 | Audit logs         | RFC-013 global        |
| RFC-013 | Permissions        | Déjà en place         |
| RFC-014 | Orchestration API  | Déjà couvert          |

---

# PHASE FUTURE (NE PAS TOUCHER)

| RFC     | Sujet                 |
| ------- | --------------------- |
| RFC-017 | Mapping utilisateurs  |
| RFC-018 | Création auto Teams   |
| RFC-019 | Sync commentaires     |
| RFC-020 | Monitoring avancé     |

---

# ORDRE RÉEL D’EXÉCUTION (ÉTAT AU 2026-03-26)

1. Fait — Microsoft OAuth, Graph, lien projet (API), sync tâches → Planner.
2. Fait — Prisma / migrations Microsoft + documents projet (backend).
3. Fait — UI liste documents (DOC-FE-001) sur fiche projet.
4. Fait — Backend sync documents → Teams (INT-009).
5. Fait — Sync bidirectionnelle tâches (INT-016) via `POST .../sync-tasks` avec phases pull/push, `lastSyncAt` en succès complet, audit normatif.
6. **Couvert (RFC-PROJ-OPT-001)** — page **Options projet** (`/projects/[projectId]/options`) : persistance `PUT` microsoft-link, OAuth, sync manuelle tâches/documents. **Partiel (RFC-006)** : la carte **sélecteurs** sur fiche projet (`ProjectMicrosoftResourceSelectorsCard`) peut rester sans branchement `PUT` si non utilisée au profit de la page Options.
7. **Partiel** — **INT-FE-009** : statuts sync **par document** dans la liste documentaire ; le **bouton** sync documents depuis **Options projet** (OPT-001) complète le flux côté pilotage projet, pas la granularité par fichier.

---

# CLARIFICATION STRATÉGIQUE

Deux couches **séparées** :

### 1. Starium (source de vérité)

* `ProjectDocument`, cockpit, logique métier.

### 2. Microsoft (projection)

* Planner : backend + sync bidirectionnelle OK (INT-016) ; **UI** : compléter sélection/persistance (voir point 6 ci-dessus).
* Documents Teams : **backend sync OK** ; **UI sync** restante (INT-FE-009).

---

# SYNTHÈSE

* Plan **exécutable** ; découpage backend / frontend cohérent.
* Prochaine valeur produit côté Microsoft : **UI** (sélecteurs/persistance fiche projet + statuts sync documents par fichier).
* Multi-tenant / client actif / pas de fuite inter-client : inchangé (guards + `X-Client-Id`).
