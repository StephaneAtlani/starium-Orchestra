Voici une **RFC propre, directement exploitable** (alignée avec ton archi, RFC-008, multi-tenant strict, sans zone d’ombre).

---

# RFC-PROJ-INT-009 — Sync documents vers Teams / SharePoint

## Statut

Draft

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

  @@unique([clientId, projectDocumentId])
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
* Upload session OK → SYNCED
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
