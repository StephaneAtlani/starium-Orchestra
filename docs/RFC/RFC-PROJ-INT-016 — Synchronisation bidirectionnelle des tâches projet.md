# RFC-PROJ-INT-016 — Synchronisation bidirectionnelle des tâches projet (Starium ↔ Microsoft Planner)

## Statut

Draft

## Dépendances

* RFC-PROJ-INT-003 — Auth Microsoft OAuth
* RFC-PROJ-INT-004 — Microsoft Graph Service
* RFC-PROJ-INT-005 — Gestion connexion client Microsoft
* RFC-PROJ-INT-006 — Sélection ressources Microsoft
* RFC-PROJ-INT-007 — Configuration projet Microsoft
* RFC-PROJ-INT-008 — Sync tâches Starium → Planner
* RFC-013 — Audit logs

---

## 1. Objectif

Permettre une **synchronisation bidirectionnelle contrôlée** des tâches projet entre :

* **Starium Orchestra** — cockpit de gouvernance et source de vérité métier
* **Microsoft Planner** — couche collaborative opérationnelle liée au projet Microsoft

L’objectif n’est pas de transformer Starium en outil de ticketing ou Planner en source de vérité, mais de permettre :

* la **projection** des tâches Starium vers Planner
* la **remontée contrôlée** des mises à jour Planner vers Starium
* la **réconciliation** des deux états avec audit et garde-fous métier

Starium reste un **cockpit de pilotage** et non un outil opérationnel généraliste. 

---

## 2. Problème résolu

La sync actuelle couvre le sens :

* **Starium → Planner**

Mais en pratique, les utilisateurs exécutent souvent le travail quotidien dans Microsoft 365 :

* mise à jour de l’état
* changement de date d’échéance
* affectation d’un membre
* renommage d’une tâche
* clôture d’une tâche

Sans synchronisation retour :

* Starium devient rapidement désynchronisé
* les KPI projet perdent en fiabilité
* la gouvernance n’a plus une vision exploitable

Cette RFC ajoute donc un **retour Planner → Starium** sans renverser la source de vérité.

---

## 3. Positionnement produit

### 3.1 Principe directeur

**Starium reste la source de vérité métier.**

Microsoft Planner est :

* une projection collaborative
* une surface d’exécution
* une source de signaux opérationnels

### 3.2 Conséquence

La synchronisation bidirectionnelle est **contrôlée**, pas symétrique.

Cela signifie :

* certains champs peuvent remonter de Planner vers Starium
* certains champs Starium ne doivent jamais être écrasés par Planner
* la suppression distante ne doit pas supprimer automatiquement une tâche Starium

---

## 4. Périmètre MVP

## Inclus

* lecture des tâches Planner d’un projet lié
* rapprochement avec les tâches Starium déjà synchronisées
* création optionnelle de tâche Starium si tâche Planner inconnue
* mise à jour contrôlée des champs supportés
* détection des conflits simples
* audit logs
* statuts et horodatages de synchronisation
* UI projet pour lancer et visualiser la sync

## Exclus du MVP

* webhooks Microsoft
* temps réel
* checklist Planner
* commentaires
* pièces jointes
* sous-tâches avancées
* suppression automatique bidirectionnelle
* résolution de conflit avancée avec merge par champ
* mapping automatique des utilisateurs Microsoft ↔ users Starium (RFC future dédiée)

---

## 5. Entités concernées

### 5.1 Côté Starium

* `Project`
* `ProjectTask`
* `ProjectMicrosoftLink`
* `ProjectTaskMicrosoftSync` (mapping existant selon le plan)

### 5.2 Côté Microsoft

* Planner Plan
* Planner Task
* éventuellement Buckets Planner pour la structuration

---

## 6. Décision clé : où porter le mapping ?

## 6.1 Décision retenue

Le mapping Microsoft **ne doit pas être porté directement par un simple champ métier sur `ProjectTask` si `ProjectTaskMicrosoftSync` existe déjà**.

On réutilise en priorité la table de mapping dédiée, plus propre pour :

* historiser
* stocker les horodatages
* gérer les conflits
* stocker les métadonnées de sync
* éviter de polluer `ProjectTask`

## 6.2 Réponse à ta question “existe-t-il déjà un champ / faut-il modifier la DB ?”

### Ce qui semble déjà exister

Ton plan mentionne explicitement :

* sync tâches → Planner faite
* mapping `ProjectTaskMicrosoftSync`

Donc il existe déjà **au moins un support de liaison** côté base.

### Ce qu’il faut probablement ajouter

Oui, **une modification DB est recommandée** pour le bidirectionnel si le mapping actuel est trop minimal.

---

## 7. Modifications Prisma recommandées

### 7.1 Si `ProjectTaskMicrosoftSync` existe déjà

L’étendre avec les champs suivants si absents :

```prisma
model ProjectTaskMicrosoftSync {
  id                    String   @id @default(cuid())
  clientId              String
  projectId             String
  projectTaskId         String
  plannerTaskId         String

  lastPushToMicrosoftAt DateTime?
  lastPullFromMicrosoftAt DateTime?

  lastMicrosoftUpdatedAt DateTime?
  lastStariumUpdatedAt   DateTime?

  lastSyncedHash         String?
  syncStatus             ProjectTaskMicrosoftSyncStatus @default(SYNCED)
  lastSyncDirection      ProjectTaskSyncDirection?
  lastSyncError          String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([clientId, plannerTaskId])
  @@unique([clientId, projectTaskId])
  @@index([clientId, projectId])
}
```

### 7.2 Enums recommandés

```prisma
enum ProjectTaskMicrosoftSyncStatus {
  SYNCED
  PENDING_PUSH
  PENDING_PULL
  CONFLICT
  ERROR
  DISABLED
}

enum ProjectTaskSyncDirection {
  STARIUM_TO_MICROSOFT
  MICROSOFT_TO_STARIUM
}
```

### 7.3 Si la table n’existe finalement pas

Alors fallback :

* ajouter `plannerTaskId`, `lastMicrosoftSyncAt`, `lastMicrosoftUpdatedAt`, `syncStatus` sur `ProjectTask`

Mais **ce n’est pas l’option préférée**.

---

## 8. Champs synchronisés

## 8.1 Planner → Starium (autorisés MVP)

* `title` → `ProjectTask.name`
* `dueDateTime` → `ProjectTask.dueDate`
* `percentComplete` → `ProjectTask.status` via mapping
* `assignments` → champ d’affectation si mapping user disponible
* `startDateTime` → optionnel si modèle Starium le supporte

## 8.2 Planner → Starium (interdits MVP)

Ne jamais écraser automatiquement :

* hiérarchie métier interne
* rattachements budgétaires
* champs d’arbitrage projet
* scoring / priorité décisionnelle
* champs internes Starium non mappés
* suppression logique / archivage métier

## 8.3 Starium → Planner

Le comportement actuel de RFC-PROJ-INT-008 reste inchangé :

* création / mise à jour côté Planner à partir des tâches Starium autorisées

---

## 9. Mapping fonctionnel

| Starium          | Microsoft Planner                            | Règle                      |
| ---------------- | -------------------------------------------- | -------------------------- |
| `ProjectTask.id` | via `ProjectTaskMicrosoftSync.projectTaskId` | mapping interne            |
| mapping          | `plannerTaskId`                              | identifiant externe        |
| `name`           | `title`                                      | bidirectionnel             |
| `dueDate`        | `dueDateTime`                                | bidirectionnel             |
| `status`         | `percentComplete`                            | mapping contrôlé           |
| `assignee`       | `assignments`                                | MVP partiel / conditionnel |
| `updatedAt`      | `lastModifiedDateTime` logique reconstituée  | support conflit            |

### 9.1 Mapping statut MVP

Proposition simple :

* `0%` → `TODO`
* `1–99%` → `IN_PROGRESS`
* `100%` → `DONE`

---

## 10. Règles métier

### 10.1 Scope client

Toutes les opérations sont strictement scopées par :

* `clientId`
* `projectId`

Aucune sync globale ni inter-client.

### 10.2 Projet lié obligatoire

La sync bidirectionnelle n’est possible que si :

* `ProjectMicrosoftLink` existe
* connexion Microsoft active
* `plannerPlanId` renseigné
* sync tâches activée

### 10.3 Pas de suppression distante destructive

Si une tâche Planner disparaît :

* ne pas supprimer automatiquement la tâche Starium
* marquer éventuellement le mapping en erreur / orphelin

### 10.4 Conflits

Un conflit simple est détecté si :

* la tâche a été modifiée côté Starium depuis la dernière sync
* et côté Planner aussi depuis la dernière sync

MVP :

* ne pas merger automatiquement
* marquer `syncStatus = CONFLICT`
* exposer l’information en UI
* laisser l’utilisateur relancer après arbitrage

### 10.5 Création depuis Planner

Option MVP retenue :

* si une tâche Planner est inconnue de Starium, elle peut être créée dans Starium **uniquement dans le projet lié**
* elle est marquée comme issue de Microsoft via le mapping

---

## 11. Stratégie de synchronisation

## 11.1 Mode MVP

**Sync manuelle uniquement**

Déclenchement via endpoint explicite.

Pas de cron imposé dans cette RFC.
Pas de webhook.

## 11.2 Ordre de traitement

1. charger projet + lien Microsoft
2. vérifier scope client
3. charger tâches Planner
4. charger mappings `ProjectTaskMicrosoftSync`
5. rapprocher
6. décider CREATE / UPDATE / SKIP / CONFLICT / ERROR
7. exécuter en transaction
8. mettre à jour les métadonnées de sync
9. écrire audit logs

---

## 12. API backend

### 12.1 Endpoint principal

```http
POST /api/projects/:projectId/microsoft-link/sync-tasks-bidirectional
```

### 12.2 Endpoint lecture état

```http
GET /api/projects/:projectId/microsoft-link/task-sync-status
```

### 12.3 Guards

Toutes les routes utilisent :

* `JwtAuthGuard`
* `ActiveClientGuard`
* `MicrosoftIntegrationAccessGuard`
* `ModuleAccessGuard`
* `PermissionsGuard`

Permissions :

* lecture statut : `projects.read`
* exécution sync : `projects.update`

---

## 13. Réponses API

### 13.1 POST sync

```json
{
  "projectId": "proj_123",
  "status": "COMPLETED",
  "summary": {
    "plannerTasksRead": 24,
    "createdInStarium": 3,
    "updatedInStarium": 8,
    "skipped": 10,
    "conflicts": 2,
    "errors": 1
  },
  "lastSyncAt": "2026-03-26T10:00:00.000Z"
}
```

### 13.2 GET statut

```json
{
  "projectId": "proj_123",
  "syncEnabled": true,
  "lastSyncAt": "2026-03-26T10:00:00.000Z",
  "summary": {
    "synced": 20,
    "conflicts": 2,
    "errors": 1
  }
}
```

---

## 14. Audit logs

Toutes les opérations significatives doivent être tracées, conformément au système d’audit métier du projet. 

Actions recommandées :

```text
project.microsoft_tasks.bidirectional_sync_started
project.microsoft_tasks.imported
project.microsoft_tasks.updated_from_microsoft
project.microsoft_tasks.conflict_detected
project.microsoft_tasks.bidirectional_sync_completed
project.microsoft_sync.failed
```

`resourceType` recommandé :

```text
project_task
project_microsoft_link
```

---

## 15. Architecture backend

Nouveau service ou extension du module existant :

```text
apps/api/src/modules/microsoft/
  project-microsoft-bidirectional-sync.service.ts
```

ou extension contrôlée de :

```text
project-microsoft-links.service.ts
```

### Règles

* pas de logique métier dans les controllers
* orchestration dans le service
* Prisma comme unique accès DB
* transaction pour les écritures
* audit après succès logique ou selon stratégie existante

Cela reste aligné avec l’architecture NestJS modulaire et le rôle des services comme porteurs de la logique métier. 

---

## 16. Frontend

Le frontend reste thin et consomme l’API. Il ne porte aucune règle métier critique. 

## 16.1 Scope UI MVP

Dans la page **Options projet** :

* bouton **“Synchroniser Starium ↔ Microsoft”**
* carte d’état de sync
* affichage :

  * `lastSyncAt`
  * nombre de tâches synchronisées
  * conflits
  * erreurs

Dans la fiche projet :

* badge par tâche :

  * synchronisée
  * conflit
  * erreur
* filtre optionnel “issues de Microsoft”

## 16.2 Hors scope frontend MVP

* écran complet de résolution de conflit
* diff détaillé par champ
* sync temps réel

---

## 17. Tests attendus

### Unit tests

* mapping Planner → ProjectTask
* détection de conflit
* status mapping percentComplete → status
* refus d’écrasement des champs interdits

### Integration tests

* isolation multi-tenant
* projet sans lien Microsoft → erreur métier
* import de tâche inconnue
* mise à jour d’une tâche liée
* conflit Starium / Planner
* disparition d’une tâche Planner sans suppression Starium

---

## 18. Décisions MVP

1. La sync bidirectionnelle cible **Planner tasks**, pas Teams “brut”.
2. Starium reste la source de vérité métier.
3. `ProjectTaskMicrosoftSync` est la source de vérité technique du mapping.
4. Une évolution Prisma est recommandée pour stocker les métadonnées de sync et conflits.
5. Pas de suppression automatique.
6. Pas de temps réel.
7. Pas de merge avancé au MVP.
8. Le frontend n’est qu’une surface de pilotage de la sync.

---

## 19. Réponse directe à ta question

### Existe-t-il déjà un champ ?

Probablement **pas un simple champ suffisant**, mais **oui, il existe déjà vraisemblablement un support de mapping** via `ProjectTaskMicrosoftSync` d’après ton plan.

### Faut-il modifier la DB ?

**Oui, je te conseille de la modifier**, mais pas en ajoutant juste `microsoftTaskId` sur `ProjectTask`.
La bonne approche est plutôt :

* **garder / étendre `ProjectTaskMicrosoftSync`**
* y ajouter :

  * horodatages push/pull
  * statut de sync
  * direction de dernière sync
  * erreur
  * détection de conflit
  * hash ou signature de dernière version synchronisée
