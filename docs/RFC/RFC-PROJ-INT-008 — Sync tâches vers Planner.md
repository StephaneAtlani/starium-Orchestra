# RFC-PROJ-INT-008 — Sync tâches vers Planner

## Statut

Draft

## Priorité

Haute

## Dépend de

* [RFC-PROJ-INT-007](./RFC-PROJ-INT-007%20—%20Lien%20projet%20Microsoft.md)
* [RFC-PROJ-INT-004](./RFC-PROJ-INT-004%20—%20Microsoft%20Graph%20Service.md)
* [RFC-PROJ-INT-002](./RFC-PROJ-INT-002%20—%20Prisma%20Schema%20Microsoft.md) (`ProjectTaskMicrosoftSync`)

## Objectif

Spécifier la synchronisation **one-way Starium → Planner** pour les `ProjectTask` d’un projet : création ou mise à jour des tâches Planner, persistance du mapping `ProjectTaskMicrosoftSync`, et **tolérance aux erreurs** (les données Starium ne sont jamais corrompues par un échec Graph).

---

## 1. Déclenchement

* Action **manuelle** (MVP) : `POST /api/projects/:id/microsoft-link/sync-tasks` (chemin indicatif, aligné [RFC-PROJ-INT-001](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md)).
* Futur : sync à la volée sur mutation de tâche — hors périmètre sauf décision produit.

## 2. Comportement

* Pour chaque `ProjectTask` du projet (filtre `clientId` + `projectId`) :
  * si **pas** de ligne `ProjectTaskMicrosoftSync` : `POST` Planner task sur le `plannerPlanId` du lien projet ; créer le mapping avec `plannerTaskId` ;
  * si mapping existe : `PATCH` Planner task (ou équivalent Graph) pour refléter Starium.
* Champs MVP à mapper : titre, description, échéance, statut / priorité (table de correspondance explicite Starium `ProjectTaskStatus` / `ProjectTaskPriority` ↔ Planner).

## 3. Statuts et erreurs

* `syncStatus` : `PENDING` → `SYNCED` ou `ERROR` ; `lastError` renseigné en cas d’échec.
* Échec Graph sur une tâche : **ne pas** supprimer la `ProjectTask` Starium ; continuer ou arrêter le batch selon politique (documenter : tout ou rien vs meilleur effort).

## 4. Permissions et scope

* **`projects.update`** (ou permission sync dédiée future).
* Vérifier `syncTasksEnabled` sur `ProjectMicrosoftLink`.

## 5. Audit

* `project.microsoft_tasks.synced`
* `project.microsoft_sync.failed` (avec agrégat ou par tentative selon besoin)

## 6. Tests

* Mock Graph : création OK, update OK, erreur 4xx/5xx → ligne `ERROR`, tâche Starium inchangée.
* **Isolation client** : impossible de sync un projet d’un autre client.

## 7. Récapitulatif

* Starium **source de vérité** ; Planner est une projection ; traçabilité complète via `ProjectTaskMicrosoftSync`.

## 8. Points de vigilance

* Limites Planner (checklists, assignation utilisateur Azure AD) — hors MVP ou RFC ultérieure.
* Performance : projets avec très nombreuses tâches → pagination batch ou job async (évolution).
