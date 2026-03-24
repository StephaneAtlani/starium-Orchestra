# RFC-PROJ-INT-009 — Sync documents vers Teams / SharePoint

## Statut

Draft

## Priorité

Moyenne (extension)

## Dépend de

* [RFC-PROJ-INT-001](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md) — **sync documentaire hors MVP** tant qu’il n’existe pas de modèle document projet côté Starium
* [RFC-PROJ-INT-007](./RFC-PROJ-INT-007%20—%20Lien%20projet%20Microsoft.md) (`filesDriveId` / `filesFolderId` ou résolution équivalente)
* [RFC-PROJ-INT-004](./RFC-PROJ-INT-004%20—%20Microsoft%20Graph%20Service.md)
* **Prérequis bloquant** : introduction d’un modèle **`ProjectDocument`** (ou équivalent métier) — **RFC / spec dédiée** ; **aucune FK `documentId` ne doit exister sans cette entité**

## Objectif

Définir, **pour une phase postérieure au MVP tâches**, la poussée des **fichiers documents projet** Starium vers le **dossier fichiers** du canal Teams (Graph : `driveItem`, upload vers le drive du canal). Comportement **one-way** Starium → Microsoft, aligné sur le cadrage.

---

## 1. Périmètre

**Inclus (quand prérequis OK)** :

* Résolution du dossier cible (canal → `filesFolder` / drive) ;
* Upload fichier (taille limite simple upload vs upload session au-delà d’un seuil — référence Microsoft Learn) ;
* Traçabilité via `ProjectDocumentMicrosoftSync` liée à **`ProjectDocument.id`**.

**Hors périmètre** :

* Sync bidirectionnelle ou résolution de conflits de version ;
* Tant que `ProjectDocument` n’existe pas : **aucune implémentation** de cette RFC.

## 2. API (indicatif)

* `POST /api/projects/:id/microsoft-link/sync-documents` — parité intention [RFC-PROJ-INT-001](./RFC-PROJ-INT-001%20—%20Intégration%20Microsoft%20365.md) § API.

## 3. Règles

* `syncDocumentsEnabled` sur le lien projet doit être respecté.
* Erreur Microsoft : mettre à jour `syncStatus` / `lastError` sur la ligne de sync **sans** supprimer le document Starium.

## 4. Audit

* `project.microsoft_documents.synced`
* `project.microsoft_sync.failed`

## 5. Tests

* Avec `ProjectDocument` mock : upload réussi, échec Graph, isolation client.

## 6. Récapitulatif

* Cette RFC est une **extension** ; elle **dépend** d’un **modèle document projet** et du spike fichiers canal déjà couvert par les RFC Graph / lien projet.

## 7. Points de vigilance

* Taille max upload simple (~250 Mo côté Graph) — au-delà, upload session obligatoire.
* Conformité et classification des documents avant envoi vers le tenant client.
