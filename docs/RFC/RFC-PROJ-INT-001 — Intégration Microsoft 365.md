# RFC-PROJ-INT-001 — Intégration Microsoft 365 / Teams / Planner

## Statut

Draft

## Priorité

Haute

## Objectif

Permettre à un projet Starium d’être connecté à Microsoft 365 afin que, lorsqu’un utilisateur autorisé active l’interconnexion Microsoft sur un projet, il puisse :

* sélectionner une équipe Microsoft Teams
* sélectionner un canal Teams
* sélectionner un plan Planner
* synchroniser les tâches du projet avec Planner
* déposer les documents du projet dans l’espace documentaire associé au canal Teams

Cette RFC introduit un socle d’intégration Microsoft pour le module Projets, sans transformer Starium en outil Microsoft-first. Starium reste la source de vérité métier du projet ; Microsoft devient un espace collaboratif connecté.

---

## 1. Problème adressé

Aujourd’hui, un projet peut être piloté dans Starium mais l’exécution collaborative vit souvent ailleurs :

* Teams pour les échanges
* Planner pour les tâches
* SharePoint pour les documents

Cela crée :

* une double saisie
* une désynchronisation entre gouvernance projet et exécution
* une perte de traçabilité
* une adoption plus difficile côté métiers

L’objectif est donc de relier le cockpit Starium à l’environnement collaboratif Microsoft déjà utilisé par les clients.

---

## 2. Positionnement produit

Cette RFC ne fait pas de Starium un clone de Teams, Planner ou SharePoint.

Starium reste :

* le cockpit de pilotage
* la source de vérité sur le projet
* le point d’arbitrage et de gouvernance

Microsoft 365 devient :

* la couche de collaboration connectée
* la destination des tâches opérationnelles
* la destination documentaire du canal projet

---

## 3. Périmètre MVP

### Inclus

* connexion d’un client Starium à un tenant Microsoft 365
* authentification OAuth2 / Microsoft Graph
* activation de l’intégration Microsoft au niveau d’un projet
* sélection Team / Channel / Planner plan
* synchronisation Starium → Planner des tâches projet
* dépôt Starium → Teams/SharePoint des documents projet
* stockage des identifiants externes Microsoft
* audit logs
* exécution strictement scopée au client actif

### Exclus du MVP

* synchronisation bidirectionnelle complète
* création automatique d’une Team
* création automatique d’un canal Teams
* création automatique d’un plan Planner
* synchronisation des commentaires / conversations Teams
* mapping avancé des checklists Planner
* gestion des permissions Microsoft par ressource
* webhooks Graph en production
* synchronisation temps réel

---

## 4. Décision d’architecture

### 4.1 Source de vérité

Pour le MVP :

* **Starium est la source de vérité**
* Microsoft est une projection opérationnelle

Donc :

* une tâche créée ou modifiée dans Starium peut être poussée vers Planner
* un document déposé dans Starium peut être envoyé vers le dossier du canal Teams
* les modifications faites directement dans Planner ne modifient pas automatiquement Starium dans le MVP

### 4.2 Sens de synchronisation MVP

Sens retenu :

* **one-way : Starium → Microsoft**

Justification :

* beaucoup plus simple
* évite les conflits de données
* évite les webhooks complexes
* garde Starium maître du modèle projet

### 4.3 Évolutions futures

En phase 2, on pourra ajouter :

* webhooks Microsoft Graph
* détection des changements Planner
* stratégie de résolution des conflits
* sync bidirectionnelle partielle

Microsoft Graph permet de travailler avec Teams, fichiers et Planner, et supporte les notifications de changement via webhooks ; ces mécanismes existent bien mais augmentent fortement la complexité. ([Microsoft Learn][1])

---

## 5. Dépendances et références externes

L’intégration repose sur **Microsoft Graph API** pour Teams, Planner et fichiers. Teams expose bien l’accès aux équipes, canaux, fichiers et plans Planner dans l’espace collaboratif Microsoft 365. ([Microsoft Learn][1])

Pour le dépôt documentaire :

* le canal Teams expose un `filesFolder`
* les fichiers peuvent être envoyés via `driveItem`
* l’upload simple supporte jusqu’à 250 MB ; au-delà, il faut une upload session. ([Microsoft Learn][2])

Pour Planner :

* les tâches sont créées via `POST /planner/tasks`
* un `plannerTask` doit cibler un `planId` existant. ([Microsoft Learn][3])

Concernant les permissions :

* les permissions Graph sont granulaires
* `Tasks.ReadWrite` existe en délégué
* les permissions fichiers existent en `Files.Read.*` / `Files.ReadWrite.*`
* certaines opérations Planner reposent en pratique sur un modèle délégué orienté utilisateur connecté. ([Microsoft Learn][4])

---

## 6. Modèle métier cible

### 6.1 Concepts introduits

#### MicrosoftConnection

Connexion Microsoft rattachée à un client Starium.

#### ProjectMicrosoftLink

Configuration Microsoft spécifique à un projet.

#### ProjectTaskSync

Lien entre une tâche Starium et une tâche Planner.

#### DocumentSync

Traçabilité d’envoi d’un document Starium vers Microsoft.

---

## 7. Règles métier

### 7.1 Scope client

Comme toute donnée Starium :

* chaque connexion Microsoft appartient à un `clientId`
* chaque lien projet ↔ Microsoft appartient à un `clientId`
* aucune route métier ne reçoit `clientId` dans le body
* tout se base sur le `clientId` actif validé par `ActiveClientGuard`

### 7.2 Activation projet

Un projet peut avoir :

* `microsoftSyncEnabled = false` par défaut
* `microsoftSyncEnabled = true` si l’intégration est configurée

Si `true`, le projet doit avoir :

* un `teamId`
* un `channelId`
* un `plannerPlanId`

### 7.3 Unicité

Un projet ne possède qu’une configuration Microsoft active à la fois.

### 7.4 Autorisation

L’activation et la configuration Microsoft doivent être réservées à des profils autorisés du module Projets, par exemple :

* `projects.update`

### 7.5 Tolérance aux erreurs

Une erreur Microsoft :

* ne doit jamais corrompre le projet Starium
* doit être journalisée
* doit produire un statut de sync explicite

---

## 8. Modèle de données Prisma

### 8.1 MicrosoftConnection

```prisma
model MicrosoftConnection {
  id                    String   @id @default(cuid())
  clientId              String
  tenantId              String
  tenantName            String?
  status                MicrosoftConnectionStatus @default(ACTIVE)

  authMode              MicrosoftAuthMode @default(DELEGATED)
  accessTokenEncrypted  String?
  refreshTokenEncrypted String?
  tokenExpiresAt        DateTime?

  connectedByUserId     String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  client                Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  connectedByUser       User?    @relation(fields: [connectedByUserId], references: [id], onDelete: SetNull)

  projectLinks          ProjectMicrosoftLink[]

  @@unique([clientId, tenantId])
  @@index([clientId])
  @@index([status])
}
```

### 8.2 ProjectMicrosoftLink

```prisma
model ProjectMicrosoftLink {
  id                    String   @id @default(cuid())
  clientId              String
  projectId             String
  microsoftConnectionId String

  isEnabled             Boolean  @default(false)

  teamId                String?
  teamName              String?
  channelId             String?
  channelName           String?
  plannerPlanId         String?
  plannerPlanTitle      String?

  filesDriveId          String?
  filesFolderId         String?
  syncTasksEnabled      Boolean  @default(true)
  syncDocumentsEnabled  Boolean  @default(true)

  lastSyncAt            DateTime?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  client                Client              @relation(fields: [clientId], references: [id], onDelete: Cascade)
  project               Project             @relation(fields: [projectId], references: [id], onDelete: Cascade)
  microsoftConnection   MicrosoftConnection @relation(fields: [microsoftConnectionId], references: [id], onDelete: Cascade)

  taskSyncs             ProjectTaskMicrosoftSync[]
  documentSyncs         ProjectDocumentMicrosoftSync[]

  @@unique([projectId])
  @@index([clientId])
  @@index([microsoftConnectionId])
}
```

### 8.3 ProjectTaskMicrosoftSync

```prisma
model ProjectTaskMicrosoftSync {
  id                    String   @id @default(cuid())
  clientId              String
  projectId             String
  projectTaskId         String
  projectMicrosoftLinkId String

  plannerTaskId         String
  lastPushedAt          DateTime?
  syncStatus            MicrosoftSyncStatus @default(PENDING)
  lastError             String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  client                Client               @relation(fields: [clientId], references: [id], onDelete: Cascade)
  project               Project              @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectTask           ProjectTask          @relation(fields: [projectTaskId], references: [id], onDelete: Cascade)
  projectMicrosoftLink  ProjectMicrosoftLink @relation(fields: [projectMicrosoftLinkId], references: [id], onDelete: Cascade)

  @@unique([projectTaskId])
  @@index([clientId, projectId])
  @@index([plannerTaskId])
}
```

### 8.4 ProjectDocumentMicrosoftSync

```prisma
model ProjectDocumentMicrosoftSync {
  id                    String   @id @default(cuid())
  clientId              String
  projectId             String
  documentId            String
  projectMicrosoftLinkId String

  driveItemId           String?
  webUrl                String?
  syncStatus            MicrosoftSyncStatus @default(PENDING)
  lastPushedAt          DateTime?
  lastError             String?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  client                Client               @relation(fields: [clientId], references: [id], onDelete: Cascade)
  project               Project              @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectMicrosoftLink  ProjectMicrosoftLink @relation(fields: [projectMicrosoftLinkId], references: [id], onDelete: Cascade)

  @@index([clientId, projectId])
}
```

### 8.5 Enums

```prisma
enum MicrosoftConnectionStatus {
  ACTIVE
  EXPIRED
  REVOKED
  ERROR
}

enum MicrosoftAuthMode {
  DELEGATED
}

enum MicrosoftSyncStatus {
  PENDING
  SYNCED
  ERROR
}
```

---

## 9. Mapping métier Starium ↔ Microsoft

### Projet

* Starium `Project`
* lié à un `Team`, un `Channel`, un `PlannerPlan`

### Tâche projet

* Starium `ProjectTask`
* liée à un `plannerTask`

### Document projet

* document Starium
* envoyé comme `driveItem` dans le dossier du canal

### Utilisateur

* Starium `User`
* peut être mappé plus tard à un `Azure AD User`
* hors MVP pour l’assignation fine automatique

---

## 10. API backend

### 10.1 Connexion Microsoft

#### GET `/api/microsoft/auth/url`

Retourne l’URL d’autorisation Microsoft pour initier le consentement.

#### GET `/api/microsoft/auth/callback`

Callback OAuth2.
Crée ou met à jour `MicrosoftConnection` pour le client actif ou pour un flux d’association sécurisé.

#### GET `/api/microsoft/connection`

Retourne l’état de la connexion Microsoft du client actif.

#### DELETE `/api/microsoft/connection`

Révoque logiquement la connexion côté Starium.

### 10.2 Sélection des ressources Microsoft

#### GET `/api/microsoft/teams`

Liste les équipes accessibles.

#### GET `/api/microsoft/teams/:teamId/channels`

Liste les canaux accessibles pour l’équipe.

#### GET `/api/microsoft/teams/:teamId/channels/:channelId/plans`

Liste les plans Planner exploitables pour le contexte choisi.

Note : la disponibilité exacte des plans dépend du contexte Teams / Planner et certaines capacités passent encore par des surfaces API spécifiques ; il faut rester strictement sur les endpoints v1.0 supportés pour le MVP et éviter `/beta` en production. ([Microsoft Learn][5])

### 10.3 Configuration projet

#### GET `/api/projects/:id/microsoft-link`

Retourne la configuration Microsoft d’un projet.

#### PUT `/api/projects/:id/microsoft-link`

Crée ou remplace la configuration :

```json
{
  "isEnabled": true,
  "teamId": "xxx",
  "channelId": "yyy",
  "plannerPlanId": "zzz",
  "syncTasksEnabled": true,
  "syncDocumentsEnabled": true
}
```

### 10.4 Synchronisation des tâches

#### POST `/api/projects/:id/microsoft-link/sync-tasks`

Pousse les tâches du projet vers Planner.

Comportement MVP :

* si tâche non liée : création Planner + création mapping local
* si tâche déjà liée : update Planner

### 10.5 Synchronisation des documents

#### POST `/api/projects/:id/microsoft-link/sync-documents`

Pousse les documents du projet vers le dossier du canal Teams.

---

## 11. Permissions backend

Routes métier client :

* `projects.read`
* `projects.update`

Éventuellement plus fin plus tard :

* `projects.integrations.read`
* `projects.integrations.update`

Pour le MVP, rester simple et réutiliser `projects.update`.

---

## 12. Authentification Microsoft

### 12.1 Mode retenu

**OAuth2 delegated**
car Planner et Teams sont fortement liés au contexte utilisateur et aux permissions consenties par le tenant / utilisateur. Les permissions Graph sont granulaires et certaines opérations Planner reposent sur des permissions déléguées. ([Microsoft Learn][4])

### 12.2 Permissions minimales à cadrer

À valider précisément à l’implémentation selon les endpoints retenus, mais base réaliste MVP :

* `User.Read`
* `Group.Read.All`
* `Tasks.ReadWrite`
* `Files.ReadWrite.All`

Selon les endpoints effectivement utilisés, certaines variantes `Files.Read.All` / `Sites.ReadWrite.All` peuvent être nécessaires ; le choix final doit suivre le principe du moindre privilège. ([Microsoft Learn][4])

### 12.3 Sécurité

* tokens chiffrés au repos
* jamais exposés au frontend
* refresh côté backend uniquement
* statut de connexion si token expiré ou révoqué

---

## 13. Logique de synchronisation MVP

### 13.1 Tâches

Pour chaque `ProjectTask` :

* créer un `plannerTask` si pas encore synchronisée
* sinon mettre à jour la tâche Planner
* stocker `plannerTaskId`
* journaliser le résultat

Champs MVP synchronisés :

* titre
* description
* date d’échéance si présente
* statut simple
* éventuellement priorité

### 13.2 Documents

Pour chaque document :

* résoudre le `filesFolder` du canal
* uploader le fichier vers le drive/folder associé
* stocker `driveItemId` et `webUrl`

Le canal Teams expose bien un dossier de fichiers via `filesFolder`, et l’upload simple supporte jusqu’à 250 MB ; pour des fichiers plus gros, une upload session sera nécessaire dans un lot ultérieur. ([Microsoft Learn][2])

### 13.3 Conflits

MVP :

* pas de lecture retour Microsoft → Starium
* pas de fusion
* pas de résolution de conflit

---

## 14. Audit logs

Actions à tracer :

* `microsoft_connection.created`
* `microsoft_connection.updated`
* `microsoft_connection.revoked`
* `project.microsoft_link.enabled`
* `project.microsoft_link.updated`
* `project.microsoft_tasks.synced`
* `project.microsoft_documents.synced`
* `project.microsoft_sync.failed`

Comme pour le reste du produit, les audit logs doivent être créés dans les services, jamais dans les controllers. 

---

## 15. UX frontend

### 15.1 Emplacement

Dans la fiche projet :

* section **Intégrations**
* carte **Microsoft 365**

### 15.2 Parcours

1. Si aucune connexion Microsoft client :

   * bouton “Connecter Microsoft”

2. Si connexion existante :

   * toggle “Activer Microsoft pour ce projet”

3. Si activé :

   * Select Team
   * Select Channel
   * Select Planner
   * toggles :

     * synchroniser les tâches
     * synchroniser les documents

4. Actions :

   * “Tester la connexion”
   * “Synchroniser les tâches”
   * “Synchroniser les documents”

### 15.3 États UI

* non connecté
* connecté
* projet non configuré
* projet configuré
* sync en cours
* sync OK
* sync erreur

Le frontend doit rester thin : toute logique de validation réelle doit rester backend. C’est conforme à l’architecture frontend Starium. 

---

## 16. Structure backend recommandée

```text
apps/api/src/modules/microsoft-integration/
├── microsoft-integration.module.ts
├── auth/
│   ├── microsoft-auth.controller.ts
│   ├── microsoft-auth.service.ts
├── graph/
│   ├── microsoft-graph.service.ts
├── project-links/
│   ├── project-microsoft-links.controller.ts
│   ├── project-microsoft-links.service.ts
│   └── dto/
├── sync/
│   ├── microsoft-project-sync.service.ts
│   ├── microsoft-task-sync.service.ts
│   ├── microsoft-document-sync.service.ts
└── types/
```

---

## 17. Tests attendus

### Unit tests

* création / update de `ProjectMicrosoftLink`
* validation du scope client
* refus si projet hors client
* refus si connexion Microsoft absente
* mapping create/update des tâches
* statut `ERROR` si appel Graph échoue

### Integration tests

* OAuth callback → création de connexion
* lecture Teams / Channels / Plans
* configuration projet
* sync tâches
* sync documents
* audit logs générés
* aucune fuite inter-client

---

## 18. Contraintes importantes

### 18.1 Multi-tenant Starium

Ne jamais supposer :

* un client Starium = un tenant Microsoft unique de manière technique immuable

Mais pour le MVP :

* une connexion Microsoft active par client est acceptable

### 18.2 Résilience

Un échec Microsoft ne doit jamais :

* supprimer une tâche Starium
* casser un projet
* bloquer l’API projet hors sync

### 18.3 Version API

Utiliser uniquement Graph v1.0 pour le MVP autant que possible.
Éviter `/beta` en production. Microsoft indique explicitement que les APIs `/beta` sont sujettes à changement et non supportées en production. ([Microsoft Learn][5])

---

## 19. Plan de livraison recommandé

### Lot 1

* MicrosoftConnection
* OAuth callback
* lecture Teams / Channels / Plans
* configuration projet

### Lot 2

* sync tâches Starium → Planner

### Lot 3

* sync documents Starium → Teams/SharePoint

### Lot 4

* fiabilisation
* relance manuelle
* journal de sync

### Lot 5

* phase 2 éventuelle :

  * webhooks
  * sync bidirectionnelle partielle

---

## 20. Décisions normatives de cette RFC

1. **Starium reste la source de vérité**
2. **MVP en synchronisation one-way**
3. **Configuration Microsoft au niveau projet**
4. **Connexion Microsoft au niveau client**
5. **Pas de `/beta` en production pour le MVP**
6. **Pas de sync bidirectionnelle dans ce lot**
7. **Tokens stockés côté backend, chiffrés**
8. **Toutes les données d’intégration sont scopées par `clientId`**

---

## 21. Résultat attendu

À l’issue de cette RFC, un client admin ou un responsable de projet autorisé pourra :

* connecter son client à Microsoft 365
* activer Microsoft sur un projet
* choisir une Team, un Channel et un Planner
* pousser ses tâches projet dans Planner
* pousser ses documents dans l’espace documentaire du canal Teams

Le tout sans casser les principes fondamentaux de Starium :

* API-first
* multi-client
* backend source de vérité
* modularité forte.  


[1]: https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview?view=graph-rest-1.0&utm_source=chatgpt.com "Use the Microsoft Graph API to work with Microsoft Teams"
[2]: https://learn.microsoft.com/en-us/graph/api/channel-get-filesfolder?view=graph-rest-1.0&utm_source=chatgpt.com "Get filesFolder - Microsoft Graph v1.0"
[3]: https://learn.microsoft.com/en-us/graph/api/planner-post-tasks?view=graph-rest-1.0&utm_source=chatgpt.com "Create plannerTask - Microsoft Graph v1.0"
[4]: https://learn.microsoft.com/en-us/graph/permissions-overview?utm_source=chatgpt.com "Overview of Microsoft Graph permissions"
[5]: https://learn.microsoft.com/en-us/graph/api/teamschannelplanner-list-plans?view=graph-rest-beta&utm_source=chatgpt.com "List plans - Microsoft Graph beta"
