# RFC-PROJ-INT-002 — Prisma Schema (intégration Microsoft)

## Statut

Draft

## Priorité

Haute

## Dépend de

* [RFC-PROJ-INT-001 — Intégration Microsoft 365](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md) (cadrage)
* Modèles existants : `Client`, `User`, `Project`, `ProjectTask` — voir [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma)

## Objectif

Définir le **modèle de données Prisma** pour l’intégration Microsoft 365 : connexion par client, lien projet, traçabilité de sync des tâches, et sync documentaire (**`ProjectDocumentMicrosoftSync`** — implémentée : [RFC-PROJ-INT-009](./RFC-PROJ-INT-009%20—%20Sync%20documents%20vers%20Teams.md) ; registre `ProjectDocument` : [RFC-PROJ-DOC-001](./RFC-PROJ-DOC-001%20—%20Modèle.md)).

---

## 1. Analyse de l’existant

* Toutes les entités métier projet portent `clientId` et sont filtrées par contexte client actif.
* `Project` et `ProjectTask` existent ; le modèle **`ProjectDocument`** est introduit par [RFC-PROJ-DOC-001](./RFC-PROJ-DOC-001%20—%20Modèle.md). La table **`ProjectDocumentMicrosoftSync`** est **en schéma** depuis l’implémentation [RFC-PROJ-INT-009](./RFC-PROJ-INT-009%20—%20Sync%20documents%20vers%20Teams.md) (voir `apps/api/prisma/schema.prisma`).

## 2. Hypothèses

* Une **connexion Microsoft** est rattachée à un **client** Starium (`clientId`), avec unicité logique `(clientId, tenantId)` pour un tenant Azure AD donné.
* Un **projet** a au plus **un** `ProjectMicrosoftLink` (`@@unique([projectId])`).
* Les tokens OAuth sont stockés **chiffrés** côté base (détail chiffrement : [RFC-PROJ-INT-003](./RFC-PROJ-INT-003%20—%20Auth%20Microsoft%20OAuth.md)).

## 3. Fichiers à créer / modifier

* `apps/api/prisma/schema.prisma` — modèles et enums ci-dessous ; relations inverses sur `Client`, `User`, `Project`, `ProjectTask`.
* Migration Prisma générée après validation de la revue.

## 4. Modèle cible (Prisma)

### 4.1 Enums

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

### 4.2 MicrosoftConnection

Connexion du **client** Starium au tenant Microsoft 365.

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

### 4.3 ProjectMicrosoftLink

Configuration Microsoft **par projet** (une ligne par projet au plus).

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

### 4.4 ProjectTaskMicrosoftSync

Lien **tâche Starium** ↔ **tâche Planner** (projection).

```prisma
model ProjectTaskMicrosoftSync {
  id                     String   @id @default(cuid())
  clientId               String
  projectId              String
  projectTaskId          String
  projectMicrosoftLinkId String

  plannerTaskId          String
  lastPushedAt           DateTime?
  syncStatus             MicrosoftSyncStatus @default(PENDING)
  lastError              String?

  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  client                 Client               @relation(fields: [clientId], references: [id], onDelete: Cascade)
  project                Project              @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectTask            ProjectTask          @relation(fields: [projectTaskId], references: [id], onDelete: Cascade)
  projectMicrosoftLink   ProjectMicrosoftLink @relation(fields: [projectMicrosoftLinkId], references: [id], onDelete: Cascade)

  @@unique([projectTaskId])
  @@index([clientId, projectId])
  @@index([plannerTaskId])
}
```

### 4.5 ProjectDocumentMicrosoftSync (extension)

**Implémenté** — voir schéma réel dans `apps/api/prisma/schema.prisma` et [RFC-PROJ-INT-009](./RFC-PROJ-INT-009%20—%20Sync%20documents%20vers%20Teams.md). Points clés : FK **`projectDocumentId`** → `ProjectDocument.id` (unicité 1–1), champs `driveId`, `driveItemId`, `folderPath`, `syncStatus`, pas de `webUrl` au MVP.

Le bloc ci-dessous était un **brouillon** ; ne pas l’utiliser comme source de vérité :

```prisma
// OBSOLÈTE — consulter schema.prisma
model ProjectDocumentMicrosoftSync {
  id                     String   @id @default(cuid())
  clientId               String
  projectId              String
  documentId             String
  projectMicrosoftLinkId String
  // …
}
```

## 5. Relations à ajouter sur les modèles existants

* `Client` : `microsoftConnections MicrosoftConnection[]`, relations sync si besoin.
* `User` : `microsoftConnectionsConnected MicrosoftConnection[]` (nom explicite selon convention repo).
* `Project` : `microsoftLink ProjectMicrosoftLink?`
* `ProjectTask` : `microsoftTaskSync ProjectTaskMicrosoftSync?`

## 6. Tests (validation schéma)

* `prisma validate` / migration appliquée sur base de test.
* Pas de logique applicative dans cette RFC.

## 7. Récapitulatif

* Schéma **client-scopé** partout ; cascade cohérente avec suppression projet/client.
* **ProjectDocumentMicrosoftSync** : livré avec **RFC-PROJ-INT-009** (`ProjectDocument` en base depuis DOC-001).

## 8. Points de vigilance

* Réviser les `onDelete` sur `ProjectTask` vs politique métier (Restrict vs Cascade) alignée avec le reste du module projets.
* Ne pas exposer les champs `*Encrypted` dans les réponses API (RFC API séparées).
