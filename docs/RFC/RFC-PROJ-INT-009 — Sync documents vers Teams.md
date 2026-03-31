Voici une **RFC propre, directement exploitable** (alignée avec ton archi, RFC-008, multi-tenant strict, sans zone d’ombre).

---

# RFC-PROJ-INT-009 — Sync documents vers Teams / SharePoint

## Statut

**Implémenté** — backend API, Prisma `ProjectDocumentMicrosoftSync`, lecture fichiers STARIUM (`PROJECT_DOCUMENTS_STORAGE_ROOT`), extension `MicrosoftGraphService` (upload simple < 4 Mo, session au-delà). **Hors livré** : UI dédiée (bouton sync / statuts) — voir plan frontend dans `_Plan de déploement - Microsofr.md`.

## Réalisation dans le repo

* **Prisma** : `apps/api/prisma/schema.prisma` (`ProjectDocumentMicrosoftSync`, relations `Client` / `Project` / `ProjectDocument` / `ProjectMicrosoftLink`) ; migration `apps/api/prisma/migrations/20260326240000_add_project_document_microsoft_sync/`
* **Backend** : `POST .../microsoft-link/sync-documents` dans `apps/api/src/modules/microsoft/project-microsoft-links.controller.ts` ; logique `syncDocuments` dans `project-microsoft-links.service.ts` ; persistance `filesDriveId` / `filesFolderId` sur `PUT` du lien projet ; module `apps/api/src/modules/microsoft/microsoft.module.ts` importe `ProjectsModule` pour `ProjectDocumentContentService`
* **Lecture binaire** : `apps/api/src/modules/projects/project-document-content.service.ts` (env **`PROJECT_DOCUMENTS_STORAGE_ROOT`**)
* **Graph** : `apps/api/src/modules/microsoft/microsoft-graph.service.ts` (`ensureFolderUnderDriveRoot`, `uploadOrReplaceDriveFile`, seuil `MICROSOFT_GRAPH_SIMPLE_UPLOAD_MAX_BYTES` dans `microsoft.constants.ts`)
* **Tests** : `project-microsoft-links.service.spec.ts`, `project-microsoft-links.controller.spec.ts`

**Schéma vs brouillon RFC §3** : le dépôt utilise `projectDocumentId String @unique` (relation 1–1 Prisma avec `ProjectDocument`) à la place de `@@unique([clientId, projectDocumentId])` — équivalent « un seul mapping par document », avec `clientId` / `projectId` toujours présents sur la ligne.

**Préconditions effectives** : comme la RFC §5, plus **`microsoftConnectionId`** (jeton Graph) et documents **`STARIUM`** avec `storageKey` non vide pour entrer dans le batch ; les autres types sont comptés en `skipped`.

## Priorité

Moyenne (extension post-MVP tâches)

## Dépend de

* RFC-PROJ-INT-001 — Intégration Microsoft 365
* RFC-PROJ-DOC-001 — Modèle `ProjectDocument`
* RFC-PROJ-INT-007 — Lien projet Microsoft (`filesDriveId`)
* RFC-PROJ-INT-004 — Microsoft Graph Service

---

# 1. Objectif

Permettre la **synchronisation one-way (Starium → Microsoft 365)** des documents projet (`ProjectDocument`) vers le dossier fichiers d’un canal Teams (SharePoint / Drive).

Starium reste la **source de vérité**. Microsoft est une projection collaborative.

---

# 2. Périmètre

## Inclus

* Upload de fichiers vers Teams (Graph Drive)
* Création automatique d’un dossier projet
* Mapping persistant Starium ↔ Microsoft
* Synchronisation manuelle via endpoint

## Hors périmètre

* Sync bidirectionnelle
* Gestion des versions
* Détection des modifications côté Microsoft
* Suppression côté Microsoft

---

# 3. Modèle de données (Prisma)

## Enum

```ts
enum MicrosoftSyncStatus {
  PENDING
  SYNCED
  ERROR
}
```

## Model

```ts
model ProjectDocumentMicrosoftSync {
  id                       String   @id @default(cuid())

  clientId                 String
  projectId                String
  projectDocumentId        String
  projectMicrosoftLinkId   String

  driveId                  String
  driveItemId              String
  folderPath               String

  syncStatus               MicrosoftSyncStatus
  lastPushedAt             DateTime?
  lastError                String?

  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  @@unique([clientId, projectDocumentId])  // implémentation repo : voir § Statut — `projectDocumentId @unique`
  @@index([clientId, projectId])
}
```

## Règles

* Scope strict : `clientId + projectId + projectDocumentId`
* Un seul mapping par document

---

# 4. Endpoint

```
POST /api/projects/:projectId/microsoft-link/sync-documents
```

## Guards

* JwtAuthGuard
* ActiveClientGuard
* MicrosoftIntegrationAccessGuard
* @RequirePermissions('projects.update')

---

# 5. Règles métier

## Préconditions

* `link.isEnabled === true`
* `link.syncDocumentsEnabled === true`
* `filesDriveId` non nul

## Politique batch

* **Stop au premier échec**
* Aucun traitement des documents suivants

---

# 6. Dossier cible Teams (normatif)

## Stratégie

* Tous les documents d’un projet sont stockés dans un dossier dédié

```
/starium-project-{projectId}
```

## Règles

* Création automatique si absent
* Aucune dépendance implicite au chemin
* `folderPath` persisté dans le mapping

---

# 7. Workflow de synchronisation

## Chargement initial

* Project
* ProjectMicrosoftLink
* ProjectDocument
* ProjectDocumentMicrosoftSync
* ordre déterministe (ex: `createdAt ASC`)

---

## Cas 1 — Document non mappé

### Étapes

1. Upload fichier vers Graph

2. Si échec :

   * aucun mapping
   * audit `project.microsoft_sync.failed`
   * stop

3. Si succès :

   * récupérer `driveItemId`
   * créer mapping :

     ```
     syncStatus = PENDING
     lastError = null
     ```

4. Finalisation :

   * passer `SYNCED`
   * `lastPushedAt = now()`

---

## Cas 2 — Document déjà mappé

### Stratégie MVP

* **Overwrite systématique du fichier**

### Étapes

1. Upload (remplacement)

2. Si échec :

   * mapping → `ERROR`
   * `lastError`
   * audit
   * stop

3. Si succès :

   * mapping → `SYNCED`
   * `lastError = null`
   * `lastPushedAt = now()`

---

# 8. Upload Microsoft Graph

## Règles

| Taille fichier | Méthode                  |
| -------------- | ------------------------ |
| < 4 MB         | Upload simple            |
| ≥ 4 MB         | Upload session (chunked) |

## Contraintes

* Pas de retry automatique (MVP)
* Échec → mapping ERROR

---

# 9. Audit

## Succès global

```
project.microsoft_documents.synced
```

## Échec

```
project.microsoft_sync.failed
```

---

# 10. lastSyncAt

* Mis à jour uniquement si **succès complet du batch**
* Inchangé en cas d’échec

---

# 11. Tests

## Cas obligatoires

* Upload simple OK → SYNCED
* Upload session OK → SYNCED *(logique dans `MicrosoftGraphService` ; pas de test unitaire dédié « gros fichier » sur le service links au moment de l’implémentation)*
* Échec upload → ERROR
* Stop au premier échec
* Mapping unique respecté
* Isolation multi-tenant
* Overwrite fonctionne

---

# 12. Points de vigilance

* Limite upload Graph (~250 MB simple, session requise sinon)
* Permissions Microsoft (Files.ReadWrite.All)
* Nom des fichiers (normalisation éventuelle)
* Conformité documentaire (RGPD, classification)

---

# 13. Récapitulatif

* Sync **one-way**
* Mapping persistant
* Batch déterministe
* Stop au premier échec
* Aucun comportement implicite

---

Si tu veux, je peux te faire la suite directe :
👉 RFC-010 = **UI Documents + Sync + statuts (cockpit DG-ready)**
👉 RFC-011 = **versioning / conformité documentaire (gros levier valeur)**
