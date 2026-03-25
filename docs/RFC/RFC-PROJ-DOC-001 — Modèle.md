# RFC-PROJ-DOC-001 — Modèle `ProjectDocument`

## Statut

**Implémenté (MVP)** — registre métier en base, API REST sous `/api/projects/:projectId/documents`, audit, tests service ; UI web **lecture seule** sur la fiche projet. **Hors scope livré** : upload/téléchargement binaire, `ProjectDocumentMicrosoftSync`, création API avec `storageType=MICROSOFT` (enum présent pour compat future).

## Réalisation dans le repo

* **Prisma** : `apps/api/prisma/schema.prisma` (`ProjectDocument`, enums) ; migration `apps/api/prisma/migrations/20260325161000_add_project_documents_registry/`
* **Backend** : `apps/api/src/modules/projects/project-documents.controller.ts`, `project-documents.service.ts`, `dto/create-project-document.dto.ts`, `dto/update-project-document.dto.ts` ; enregistrement dans `projects.module.ts` ; audit dans `project-audit.constants.ts`, `project-audit-serialize.ts`
* **Tests** : `apps/api/src/modules/projects/project-documents.service.spec.ts`
* **Frontend** : `apps/web/src/features/projects/components/project-documents-section.tsx` (intégré dans `project-sheet-view.tsx`) ; `listProjectDocuments` dans `projects.api.ts` ; `projectQueryKeys.documents` ; `use-project-documents-query.ts` ; types et labels enum dans `project.types.ts` / `project-enum-labels.ts`

## Priorité

Haute

## Dépend de

* Module `projects` existant
* Architecture multi-tenant Starium (client actif obligatoire)
* Patterns Prisma / NestJS / audit logs existants

## Débloque

* RFC-PROJ-INT-009 — Sync documents vers Teams / SharePoint
* Futures fonctionnalités documentaires projet
* Traçabilité documentaire projet
* Base de conformité / classification documentaire

---

# 1. Objectif

Introduire un **modèle métier `ProjectDocument`** dans Starium Orchestra pour représenter les **documents rattachés à un projet**, indépendamment du canal de stockage ou de synchronisation.

Ce modèle doit permettre :

* de rattacher un document à un projet donné ;
* de tracer son origine et son mode de stockage ;
* de préparer la future synchronisation Microsoft 365 sans coupler dès maintenant le cœur métier projet à Graph ;
* de rester strictement conforme au modèle **multi-tenant** Starium ;
* de servir de socle à une future gestion documentaire projet plus riche.

`ProjectDocument` est une **entité métier Starium**.
Microsoft 365 n’est qu’une **projection externe optionnelle**.

---

# 2. Positionnement produit

## 2.1 Rôle de Starium

Starium reste :

* la **source de vérité métier** ;
* le cockpit de pilotage projet ;
* le point central de gouvernance documentaire projet.

## 2.2 Rôle de Microsoft

Microsoft 365 / SharePoint / Teams reste :

* une destination de projection documentaire ;
* un canal collaboratif ;
* jamais la source de vérité métier du document projet dans cette RFC.

## 2.3 Ce que cette RFC n’est pas

Cette RFC **ne crée pas une GED complète**.
Elle pose un **socle documentaire projet minimal, robuste et extensible**.

---

# 3. Périmètre

## 3.1 Inclus

* Modèle Prisma `ProjectDocument`
* Enum(s) nécessaires
* Relations avec `Project` et `Client`
* CRUD backend minimal
* Validation métier de base
* Audit minimal
* Isolation multi-tenant stricte
* Préparation à la future sync Microsoft

## 3.2 Hors périmètre

* Sync documentaire Microsoft effective
* Gestion des versions avancée
* Check-in / check-out
* Prévisualisation de fichiers
* OCR / indexation documentaire
* Arborescence documentaire complexe
* Dossiers imbriqués
* Partage public
* Antivirus / DLP / classification automatique
* GED transverse à tous les modules Starium

---

# 4. Hypothèses structurantes

1. Un `ProjectDocument` appartient à **un seul client**.
2. Un `ProjectDocument` appartient à **un seul projet**.
3. Le document peut être :

   * stocké côté Starium ;
   * référencé depuis une source externe ;
   * ultérieurement synchronisé vers Microsoft.
4. Cette RFC ne suppose **aucune bidirectionnalité**.
5. La suppression logique est préférable à la suppression physique directe.
6. Le modèle doit permettre plus tard d’ajouter une table de sync dédiée (`ProjectDocumentMicrosoftSync`) sans refactor cassant.

---

# 5. Modèle métier

## 5.1 Concept

`ProjectDocument` représente un **objet documentaire métier** lié à un projet.

Il ne représente pas seulement un “fichier technique”, mais une ressource documentaire gouvernée :

* avec un nom lisible ;
* un type logique ;
* un emplacement de stockage ;
* un état ;
* une traçabilité ;
* éventuellement une classification.

## 5.2 Cas d’usage cibles

* Déposer un document de cadrage projet
* Stocker un contrat projet
* Joindre un livrable
* Préparer l’envoi vers le dossier Teams du projet
* Suivre quels documents sont actifs, archivés ou supprimés

---

# 6. Modèle de données Prisma

## 6.1 Enums

```prisma
enum ProjectDocumentStorageType {
  STARIUM
  EXTERNAL
  MICROSOFT
}

enum ProjectDocumentStatus {
  ACTIVE
  ARCHIVED
  DELETED
}

enum ProjectDocumentCategory {
  GENERAL
  CONTRACT
  SPECIFICATION
  DELIVERABLE
  REPORT
  FINANCIAL
  COMPLIANCE
  OTHER
}
```

## 6.2 Modèle principal

```prisma
model ProjectDocument {
  id                String                     @id @default(cuid())
  clientId          String
  projectId         String

  name              String
  originalFilename  String?
  mimeType          String?
  extension         String?
  sizeBytes         Int?

  category          ProjectDocumentCategory    @default(GENERAL)
  status            ProjectDocumentStatus      @default(ACTIVE)
  storageType       ProjectDocumentStorageType @default(STARIUM)

  storageKey        String?
  externalUrl       String?

  description       String?
  tags              Json?

  uploadedByUserId  String?
  createdAt         DateTime                   @default(now())
  updatedAt         DateTime                   @updatedAt
  archivedAt        DateTime?
  deletedAt         DateTime?

  client            Client                     @relation(fields: [clientId], references: [id], onDelete: Cascade)
  project           Project                    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  uploadedByUser    User?                      @relation("ProjectDocumentUploadedBy", fields: [uploadedByUserId], references: [id], onDelete: SetNull)

  @@index([clientId])
  @@index([projectId])
  @@index([clientId, projectId])
  @@index([clientId, status])
  @@index([clientId, projectId, status])
  @@index([storageType])
}
```

> **Implémentation actuelle** : le schéma livré correspond au bloc ci-dessus (sans relation inverse `ProjectDocumentMicrosoftSync` : voir §8 / RFC-PROJ-INT-009).

---

# 7. Justification des champs

## 7.1 Clés de rattachement

* `clientId` : obligatoire pour l’isolation multi-tenant
* `projectId` : obligatoire pour le rattachement métier projet

## 7.2 Identification documentaire

* `name` : nom métier affiché dans l’UI
* `originalFilename` : nom du fichier source si upload
* `mimeType` / `extension` / `sizeBytes` : métadonnées techniques utiles

## 7.3 Gouvernance

* `category` : classification simple
* `status` : cycle de vie minimal
* `description` : contexte métier
* `tags` : extensibilité légère sans surmodélisation immédiate

## 7.4 Stockage

* `storageType` :

  * `STARIUM` : document géré localement / stockage applicatif
  * `EXTERNAL` : URL ou ressource externe
  * `MICROSOFT` : document nativement rattaché à une ressource Microsoft
* `storageKey` : identifiant technique interne de stockage
* `externalUrl` : lien externe si applicable

## 7.5 Traçabilité

* `uploadedByUserId`
* `createdAt`, `updatedAt`
* `archivedAt`, `deletedAt`

---

# 8. Relation avec `ProjectDocumentMicrosoftSync`

Cette RFC autorise l’introduction ultérieure de :

```prisma
model ProjectDocumentMicrosoftSync {
  id                     String   @id @default(cuid())
  clientId               String
  projectId              String
  documentId             String
  projectMicrosoftLinkId String

  driveId                String?
  driveItemId            String?
  webUrl                 String?

  syncStatus             MicrosoftSyncStatus @default(PENDING)
  lastSyncedAt           DateTime?
  lastError              String?

  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  client                 Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
  project                Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  document               ProjectDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([projectId])
  @@index([documentId])
}
```

Mais :

* **elle ne doit pas être implémentée dans cette RFC si RFC-PROJ-INT-009 n’est pas lancée**
* la présente RFC doit simplement **rendre ce futur ajout possible sans refonte**

---

# 9. Règles métier

## 9.1 Multi-tenant

Toutes les opérations doivent être filtrées par :

* `clientId` issu du contexte actif
* jamais depuis le body utilisateur comme source de vérité

## 9.2 Rattachement projet

Un document ne peut être créé que sur un projet :

* existant ;
* appartenant au client actif.

## 9.3 Statuts

* `ACTIVE` : visible et exploitable
* `ARCHIVED` : conservé mais non actif
* `DELETED` : suppression logique, non affiché par défaut

## 9.4 Soft delete

La suppression logique est privilégiée :

* `status = DELETED`
* `deletedAt` renseigné

Pas de suppression physique immédiate côté base dans le flux standard.

## 9.5 Stockage

### `STARIUM`

* `storageKey` requis
* `externalUrl` interdit ou ignoré

### `EXTERNAL`

* `externalUrl` requis
* `storageKey` optionnel / absent

### `MICROSOFT`

* utilisé seulement si un document est déjà référencé côté Microsoft dans un scénario futur maîtrisé
* cette RFC n’impose pas encore son usage métier

## 9.6 Intégrité minimale

* `sizeBytes >= 0` si renseigné
* `name` non vide
* validation stricte du `mimeType` et de l’extension au niveau applicatif si upload géré

---

# 10. API backend minimale

## 10.1 Endpoints proposés

### Liste

`GET /api/projects/:projectId/documents`

Retourne les documents actifs et archivés du projet du client actif.

### Détail

`GET /api/projects/:projectId/documents/:documentId`

Retourne un document donné s’il appartient :

* au projet demandé
* au client actif

### Création

`POST /api/projects/:projectId/documents`

Crée une entrée `ProjectDocument`.

### Mise à jour

`PATCH /api/projects/:projectId/documents/:documentId`

Met à jour les métadonnées documentaires autorisées.

### Archivage

`POST /api/projects/:projectId/documents/:documentId/archive`

Passe le document en `ARCHIVED`.

### Suppression logique

`DELETE /api/projects/:projectId/documents/:documentId`

Passe le document en `DELETED`.

## 10.2 Hors périmètre API

* téléchargement binaire complet si le système de stockage n’est pas encore finalisé
* upload multipart complexe
* versionning documentaire

---

# 11. DTO recommandés

## 11.1 CreateProjectDocumentDto

Champs recommandés :

* `name`
* `originalFilename?`
* `mimeType?`
* `extension?`
* `sizeBytes?`
* `category?`
* `storageType`
* `storageKey?`
* `externalUrl?`
* `description?`
* `tags?`

## 11.2 UpdateProjectDocumentDto

Champs modifiables :

* `name?`
* `category?`
* `description?`
* `tags?`
* `status?` seulement si on accepte ce contrôle via PATCH, sinon réserver aux endpoints dédiés

---

# 12. Validation métier backend

## 12.1 Création

Vérifications obligatoires :

1. Projet existe dans le `clientId` actif
2. `name` valide
3. `storageType` valide
4. Cohérence des champs de stockage :

   * `STARIUM` → `storageKey` obligatoire
   * `EXTERNAL` → `externalUrl` obligatoire
5. `sizeBytes` non négatif si renseigné

## 12.2 Lecture / modification

Toujours filtrer par :

* `id`
* `projectId`
* `clientId`
* `status != DELETED` sauf cas admin explicite

---

# 13. Permissions

## 13.1 Permissions minimales proposées

* `projects.read` pour lecture
* `projects.update` pour création / modification / archivage / suppression logique

## 13.2 Principe

On ne crée pas de module RBAC séparé “documents” à ce stade.
Les documents projet sont considérés comme faisant partie du domaine projet.

---

# 14. Audit logs

## 14.1 Événements recommandés

* `project.document.created`
* `project.document.updated`
* `project.document.archived`
* `project.document.deleted`

## 14.2 Payload minimum

* `clientId`
* `projectId`
* `documentId`
* `storageType`
* `category`
* utilisateur initiateur

## 14.3 Principe

Audit aligné avec la convention Starium existante :

* nomenclature homogène
* resourceType cohérent
* pas de logs bruités inutiles

---

# 15. Service backend

## 15.1 Service attendu

`project-documents.service.ts`

Responsabilités :

* valider le périmètre client/projet
* créer / lire / mettre à jour / archiver / supprimer logiquement
* préparer l’extension future vers la sync Microsoft

## 15.2 Interdits

* aucune logique Graph ici
* aucune logique Teams ici
* aucune logique Planner ici
* aucune dépendance dure à Microsoft pour exister

---

# 16. Contrôleur backend

## 16.1 Contrôleur attendu

`project-documents.controller.ts`

Règles :

* routes sous `/api/projects/:projectId/documents`
* guards existants Starium
* `@RequirePermissions('projects.read')` ou `projects.update` selon l’action
* aucun `clientId` en body/query comme source de vérité

---

# 17. Intégration UI

## 17.1 Hors MVP strict

La RFC n’impose pas une UI complète, mais la structure attendue est :

* onglet ou section “Documents” dans la fiche projet
* liste simple
* badges catégorie / statut
* actions : créer / modifier / archiver / supprimer

## 17.2 Objectif UX

Rester cohérent avec le cockpit projet, sans inventer une mini GED complexe.

---

# 18. Sécurité

## 18.1 Risques

* fuite cross-tenant
* accès à un document d’un autre projet
* URL externe non contrôlée
* métadonnées de fichier non fiables
* suppression physique accidentelle

## 18.2 Exigences

* filtrage strict par `clientId`
* filtrage strict par `projectId`
* validation URL si `EXTERNAL`
* jamais faire confiance au nom de fichier
* ne jamais dériver un chemin disque depuis une entrée utilisateur sans validation stricte
* si upload binaire ultérieur : protections path traversal, taille, mime, extension, antivirus si besoin

---

# 19. Migration Prisma

## 19.1 Contenu

* ajout enums
* ajout table `ProjectDocument`
* index
* relations `Project`, `Client`, `User`

## 19.2 Contraintes

* migration additive
* sans casser le module projet existant
* sans introduire immédiatement `ProjectDocumentMicrosoftSync` si non utilisé

---

# 20. Tests attendus

## 20.1 Unit tests

* création valide
* rejet si projet hors client actif
* rejet si `STARIUM` sans `storageKey`
* rejet si `EXTERNAL` sans `externalUrl`

## 20.2 Integration / e2e

* lecture limitée au client actif
* impossible d’accéder à un document d’un autre client
* impossible de modifier un document d’un autre projet
* archivage OK
* suppression logique OK

## 20.3 Sécurité

* cas négatifs permissions
* cas négatifs projet non accessible
* cas négatifs document inexistant ou supprimé

---

# 21. Décisions d’architecture

## 21.1 Décision 1

`ProjectDocument` est une **entité métier dédiée**.
On ne réutilise pas un modèle générique inexistant ou flou.

## 21.2 Décision 2

La RFC reste **découplée de Microsoft**.
La sync documentaire Microsoft sera une extension, pas le cœur du modèle.

## 21.3 Décision 3

On privilégie **soft delete + audit**.

## 21.4 Décision 4

Les permissions restent dans le domaine `projects.*` au MVP.

---

# 22. Non-objectifs explicites

Cette RFC ne doit pas :

* ouvrir un chantier GED transverse
* imposer SharePoint comme source de vérité
* introduire la sync documentaire maintenant
* introduire le versionning documentaire avancé
* introduire des dossiers hiérarchiques complexes
* créer une dépendance métier au frontend

---

# 23. Critères d’acceptation

La RFC est considérée comme remplie si :

1. un modèle `ProjectDocument` existe en base ;
2. il est strictement client-scopé ;
3. il est lié à `Project` ;
4. un CRUD minimal backend existe ;
5. la suppression logique est gérée ;
6. l’audit minimal existe ;
7. le futur rattachement à `ProjectDocumentMicrosoftSync` est possible sans refonte.

---

# 24. Ordre de mise en œuvre recommandé

1. Prisma schema + migration
2. DTO + service
3. contrôleur
4. audit logs
5. tests
6. seulement ensuite : RFC-PROJ-INT-009

---

# 25. Prompt Cursor prêt à copier

```text
Tu dois implémenter RFC-PROJ-DOC-001 — Modèle ProjectDocument.

Contraintes strictes :
- tu dois respecter l’architecture existante NestJS / Prisma / multi-tenant de Starium Orchestra
- clientId doit toujours provenir du contexte client actif, jamais du body comme source de vérité
- aucun couplage métier à Microsoft dans cette RFC
- aucune logique Teams / Graph / SharePoint dans le service ProjectDocument
- permissions réutilisées : projects.read / projects.update
- suppression logique obligatoire
- audit minimal obligatoire

Périmètre exact :
1. Ajouter les enums Prisma :
   - ProjectDocumentStorageType = STARIUM | EXTERNAL | MICROSOFT
   - ProjectDocumentStatus = ACTIVE | ARCHIVED | DELETED
   - ProjectDocumentCategory = GENERAL | CONTRACT | SPECIFICATION | DELIVERABLE | REPORT | FINANCIAL | COMPLIANCE | OTHER

2. Ajouter le modèle Prisma ProjectDocument avec :
   - id, clientId, projectId
   - name, originalFilename, mimeType, extension, sizeBytes
   - category, status, storageType
   - storageKey, externalUrl
   - description, tags
   - uploadedByUserId
   - createdAt, updatedAt, archivedAt, deletedAt
   - relations vers Client, Project, User
   - index sur clientId, projectId, clientId+projectId, clientId+status, clientId+projectId+status, storageType

3. Ajouter la relation inverse nécessaire dans Project.
4. Ne pas implémenter ProjectDocumentMicrosoftSync dans cette RFC sauf si déjà requis techniquement par un schéma compilable, mais sans logique métier associée.
5. Créer :
   - project-documents.controller.ts
   - project-documents.service.ts
   - dto/create-project-document.dto.ts
   - dto/update-project-document.dto.ts

6. Routes attendues :
   - GET /api/projects/:projectId/documents
   - GET /api/projects/:projectId/documents/:documentId
   - POST /api/projects/:projectId/documents
   - PATCH /api/projects/:projectId/documents/:documentId
   - POST /api/projects/:projectId/documents/:documentId/archive
   - DELETE /api/projects/:projectId/documents/:documentId

7. Règles métier obligatoires :
   - vérifier que le projet appartient au client actif
   - filtrer toutes les requêtes par clientId + projectId
   - STARIUM => storageKey obligatoire
   - EXTERNAL => externalUrl obligatoire
   - suppression logique = status DELETED + deletedAt
   - archivage = status ARCHIVED + archivedAt

8. Sécurité :
   - guards et permissions conformes aux patterns existants
   - aucune fuite cross-tenant
   - pas de clientId en body
   - validations DTO strictes

9. Audit logs obligatoires :
   - project.document.created
   - project.document.updated
   - project.document.archived
   - project.document.deleted

10. Tests à produire :
   - unit tests service
   - cas négatifs multi-tenant
   - cas négatifs permissions
   - tests des règles STARIUM / EXTERNAL
   - tests archivage / suppression logique

Tu dois rester minimal, robuste, et parfaitement aligné avec les conventions existantes du repo. N’ajoute pas de GED complexe, pas de versionning, pas de logique Microsoft.