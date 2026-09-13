# RFC-PROJ-DOC-002 — Silo Documents projet, upload et rattachements

| | |
| --- | --- |
| **Statut** | ✅ Implémentée (P0–P2) |
| **Date** | 2026-09-13 |
| **Parents** | [RFC-PROJ-DOC-001](./RFC-PROJ-DOC-001%20—%20Modèle.md) (registre métier) ; [RFC-PROJ-INT-009](./RFC-PROJ-INT-009%20—%20Sync%20documents%20vers%20Teams.md) (lecture disque STARIUM + sync) |
| **Supersède (UI)** | [RFC-PROJ-DOC-FE-001](./RFC-PROJ-DOC-FE-001%20—%20Frontend%20ProjectDocument%20UI.md) — enums / routes désalignés ; cette RFC est la spec produit + UX cible |
| **Consommateurs** | Points projet ([RFC-PROJ-013-2](./RFC-PROJ-013-2%20—%20Point%20projet%20de%20pilotage%20(COPIL,%20COPROJ,%20revues,%20arbitrages).md) / 013-6 / 013-8 / 013-10) ; Réunions ([RFC-MEET-001](./RFC-MEET-001%20—%20Réunions.md) si présent) ; fiche / options Microsoft |
| **Source visuelle** | Mock [*Refonte Portail Client*](./_sources/Design%20system%20et%20CDC/ui_kits/app/Refonte%20Portail%20Client.html) — onglet **Documents** (tableau + activité) ; patterns `doc-row` / « Documents présentés » (préparation & séance) |
| **Backlog** | NTH.3 `docs-project` ; plan déploiement Projet « Documents & Attachments » |
| **Pont** | `docs-project` dans [LIAISONS-MODULES.md](../LIAISONS-MODULES.md) — statut cible **live** après cette RFC |

---

## 0. Objet

Passer le registre `ProjectDocument` (DOC-001, métadonnées + liste read-only) au **silo documentaire projet** du mock :

1. **Onglet Documents** du workspace projet (liste riche, ajout, filtres, activité) ;
2. **Upload / téléchargement** binaire `STARIUM` (+ liens `EXTERNAL`) ;
3. **Rattachements** : un même document peut être **lié** depuis un point, un sujet d’ODJ, une décision, une action, une réunion — sans dupliquer le fichier ;
4. **Picker réutilisable** « Lier un document du projet » + « coller un lien » + « joindre un fichier maintenant ».

`ProjectDocument` reste la **source de vérité** du silo projet. Les tables `ProjectReviewAttachment` / `MeetingAttachment` restent des **liens de contexte**, pas une seconde GED.

**Hors confusion** : GED transverse multi-modules (`fut-ged-project`, RFC-034 Achats) = futur. Ici = **silo projet uniquement**.

---

## 1. Analyse de l’existant

### 1.1 Mock (cible UX)

Onglet `data-pane="docs"` du mock portail :

| Zone | Comportement |
| --- | --- |
| Segmented Documents / Activité | Liste vs timeline d’événements documentaires |
| CTA « Ajouter un document » | Upload / lien (split secondaire possible) |
| Recherche + filtres Type / Modifié | FilterBar |
| Table | Nom (icône type) · Type · Modifié le · Auteur · Taille · menu ⋯ |
| Rail « Activité récente » | Qui a ajouté / mis à jour / créé le dossier |
| Ailleurs (prépa / séance) | Liste supports · select « Lier un support… » · URL externe · file input « Joindre maintenant » · chips liés |

### 1.2 Socle déjà en place

| Couche | État | Écart vs mock |
| --- | --- | --- |
| Prisma `ProjectDocument` + enums | ✅ DOC-001 | OK comme registre |
| CRUD API métadonnées | ✅ `/api/projects/:projectId/documents` | Pas d’upload multipart ni download HTTP exposé produit |
| `ProjectDocumentContentService` | ✅ lecture disque pour INT-009 | Pas d’écriture upload ; pas d’endpoint download UI |
| UI `ProjectDocumentsSection` | ✅ read-only dans la **fiche** | Pas d’**onglet** workspace ; pas d’ajout / download |
| `project-workspace-tabs` | ✅ équipes, points, … | **Pas** d’onglet Documents |
| `ProjectReviewAttachment.documentId` | ✅ + UI select dans agenda / attachments | Picker basique ; pas d’upload « maintenant » → création `ProjectDocument` |
| Animation séance « Documents présentés » | ✅ partiel | Alignement CDC à compléter (lien + fichier) |
| `MeetingAttachment` → `ProjectDocument` | ✅ schéma | Même pattern picker à unifier |
| Sync Teams INT-009 | ✅ backend | Consomme fichiers STARIUM déjà sur disque |

### 1.3 Décision d’architecture

| Option | Verdict |
| --- | --- |
| A — Enrichir DOC-001 + UI silo + API binaires + picker partagé | **Retenue** |
| B — Nouvelle entité `ProjectFile` parallèle | Doublon ; casse INT-009 / attachments |
| C — Attendre GED transverse 2027 | Contredit mock + NTH.3 + usages Points déjà branchés |

---

## 2. Hypothèses

1. **H1 — Un document = un projet = un client.** Pas de partage inter-projets V1 (copier = nouvel enregistrement).
2. **H2 — Soft delete** DOC-001 conserve : les attachments gardent `documentId` nullable (`onDelete: SetNull`) ; UI affiche « Document retiré du projet » via `displayLabel`, jamais l’ID.
3. **H3 — Permissions** : `projects.read` lecture/liste/download ; `projects.update` upload / create link / archive / delete / rattacher. Pas de permission `documents.*` V1.
4. **H4 — Stockage STARIUM** : même racine `PROJECT_DOCUMENTS_STORAGE_ROOT/{clientId}/{projectId}/{storageKey}` que INT-009 ; `storageKey` généré serveur (jamais chemin utilisateur).
5. **H5 — Taille max V1** : 25 Mo / fichier (configurable env `PROJECT_DOCUMENTS_MAX_BYTES`) ; MIME allowlist (pdf, office, images, txt, csv, zip) — rejet 422 sinon.
6. **H6 — « Joindre maintenant »** depuis un point / réunion = **crée** un `ProjectDocument` STARIUM **et** un attachment pointant dessus (transaction).
7. **H7 — Activité** : dérivée des audit logs `project.document.*` (+ éventuellement `project.review.attachment.*`) ; pas de table dédiée V1.
8. **H8 — Dossiers** : mock montre « Documents projet » une fois ; **pas** d’arborescence V1 (flat + catégories). Dossiers = V1.1.
9. **H9 — Preview inline** (PDF viewer) : hors scope V1 ; ouvrir / télécharger / nouvel onglet si `EXTERNAL`.
10. **H10 — DOC-FE-001** : enums `MANUAL`/`LINK`/`DRAFT`/`title` **non retenus** — alignement strict sur Prisma DOC-001 (`name`, `STARIUM`/`EXTERNAL`/`MICROSOFT`, `ACTIVE`/`ARCHIVED`/`DELETED`).

---

## 3. Fichiers à créer / modifier (implémentation)

### Backend

| Fichier | Action |
| --- | --- |
| `project-documents.controller.ts` | `POST …/upload` (multipart) ; `GET …/:id/download` ; query list `search`/`category`/`extension`/`sort` |
| `project-documents.service.ts` | create-from-upload ; cohérence STARIUM ; soft-delete fichier optionnel différé |
| `project-document-content.service.ts` | `writeStariumBuffer` + gardes path déjà présentes |
| DTOs | `UploadProjectDocumentDto` (champs form) ; filtres list |
| Audit | `project.document.uploaded` (ou réutiliser `created` avec payload `via: upload`) |
| Tests | isolation client, path traversal, MIME/taille, download 404 cross-project |

### Frontend

| Fichier | Action |
| --- | --- |
| `project-workspace-tabs.tsx` + routes | Onglet **Documents** (`?tab=docs` ou `/documents`) |
| `features/projects/documents/*` | Page silo (table + activité) ; dialogs add ; badges type fichier |
| `project-document-picker.tsx` (shared) | Combobox libellés métier + « Coller un lien » + « Joindre un fichier » |
| Consommateurs | `review-attachments-section`, agenda point, animate session, meetings | Brancher le picker unique |
| Remplacer / réduire | `project-documents-section.tsx` | Devenir résumé fiche **ou** rediriger vers l’onglet |

### Doc

| Fichier | Action |
| --- | --- |
| `docs/API.md` | Routes upload / download / query |
| `docs/LIAISONS-MODULES.md` | `docs-project` → live ; noter ponts Points / Meetings |
| `docs/RFC/_RFC Liste.md` | Entrée 14c′ |
| `docs/BACKLOG.md` | NTH.3 → cette RFC |
| `docs/INVENTAIRE-COMPOSANTS.md` | Picker + page Documents si composants socle |

---

## 4. Modèle de données

### 4.1 Aucun modèle nouveau obligatoire (V1)

Réutiliser :

```text
ProjectDocument          ← silo (métadonnées + storage)
ProjectReviewAttachment  ← lien contexte point (documentId | url | FILE meta)
MeetingAttachment        ← lien contexte réunion
ProjectDocumentMicrosoftSync ← projection INT-009 (inchangé)
```

### 4.2 Extensions optionnelles (si besoin audit activité)

| Champ | Pourquoi | Décision |
| --- | --- | --- |
| `uploadedByUser` déjà présent | Auteur colonne mock | ✅ |
| Index `(clientId, projectId, updatedAt)` | Tri « Modifié le (récent) » | Ajouter si perf liste |
| Table `ProjectDocumentFolder` | Mock « dossier » | **Hors V1** (H8) |

### 4.3 Règles de rattachement

| Contexte | Table | `attachmentType` | Création |
| --- | --- | --- | --- |
| Point / ODJ / décision / action | `ProjectReviewAttachment` | `DOCUMENT_REFERENCE` ou `LINK` / `FILE` existants | Lier id **ou** upload→doc+attachment |
| Réunion | `MeetingAttachment` | idem | idem |
| Silo seul | `ProjectDocument` | — | Upload / lien sans attachment |

Un document peut avoir **N** attachments. Suppression soft du document : attachments restent mais `documentId=null` + libellé « Document retiré ».

---

## 5. API

### 5.1 Existantes (DOC-001) — à conserver

- `GET /api/projects/:projectId/documents`
- `GET /api/projects/:projectId/documents/:documentId`
- `POST /api/projects/:projectId/documents` (métadonnées / EXTERNAL)
- `PATCH …` / `POST …/archive` / `DELETE …` (soft)

### 5.2 Nouvelles

#### Upload

`POST /api/projects/:projectId/documents/upload`  
`Content-Type: multipart/form-data`

| Part | Règle |
| --- | --- |
| `file` | Obligatoire |
| `name?` | Défaut = nom fichier sanitisé |
| `category?` | Enum DOC-001 |
| `description?` | Optionnel |

Réponse : même shape que create (`ProjectDocument` + `storageType=STARIUM`, `storageKey` serveur, mime/size/extension).

#### Download

`GET /api/projects/:projectId/documents/:documentId/download`

- `STARIUM` : stream fichier + `Content-Disposition` (filename = `originalFilename` ou `name`)
- `EXTERNAL` : **302** vers `externalUrl` **ou** 422 « ouvrir via lien » (trancher en implémentation : préférer **pas de proxy** → front ouvre `externalUrl`)
- `MICROSOFT` : lecture seule via `webUrl` sync si présent ; sinon 422

#### Liste enrichie

Query params :

- `search` (name / originalFilename)
- `category`
- `status` (défaut exclut `DELETED`)
- `storageType`
- `extension` / type logique (pdf, xlsx…)
- `sort=updatedAt:desc|name:asc`
- `limit` / `offset`

#### Activité (option V1)

`GET /api/projects/:projectId/documents/activity?limit=20`  
Agrège audit `project.document.*` du projet (acteur = libellé user, **pas** email en clair dans logs déjà anonymisés).

Sinon V1 UI : dériver des `updatedAt` liste + toasts — documenter le choix en implémentation.

### 5.3 Attachments (inchangés contractuellement)

Les endpoints Points / Meetings existants acceptent déjà `documentId`. Étendre uniquement si « joindre maintenant » est fait **côté silo d’abord** puis `POST attachment { documentId }` (recommandé) plutôt qu’un mega-endpoint mixte.

---

## 6. UX / écrans

### 6.1 Onglet Documents (mock)

Composition :

- `PageHeader` implicite via workspace (titre projet déjà là) + toolbar locale
- Segmented : **Documents** | **Activité**
- CTA primaire : **Ajouter un document** → `StariumModal` (upload **ou** lien externe)
- `FilterBar` : recherche, type fichier, tri date
- Table DS (bordures horizontales) : colonnes mock ; menu ⋯ = Télécharger / Ouvrir lien / Modifier métadonnées / Archiver / Supprimer
- Rail droit `lg+` : Activité récente ; sous `lg` : onglet Activité du segmented

États : `LoadingState` / `EmptyState` (« Aucun document — ajoutez un livrable ou un lien ») / `ErrorState` + retry.

### 6.2 Picker partagé `ProjectDocumentPicker`

Props typiques :

- `projectId`
- `value: documentId | null`
- `onLinkDocument(documentId)`
- `onLinkExternalUrl(url, title)`
- `onUploadAndLink?(file)` → upload silo puis callback id
- `excludeIds?`

Affichage options : **`name`** (+ badge catégorie / extension), **jamais** l’id (`displayLabel`).

Usages obligatoires V1 :

1. Préparation point — documents par sujet ODJ  
2. Animation — « Documents présentés »  
3. Finalisation / CR — liste documents de séance  
4. Section Documents & liens de l’éditeur de point  
5. (Si UI meetings active) pièces jointes réunion  

### 6.3 Fiche projet

Section documents actuelle : **résumé** (3 derniers + lien « Voir tous ») vers l’onglet — éviter deux vérités UX.

### 6.4 Libellés (valeur, pas ID)

| Champ | Affiché |
| --- | --- |
| Document | `name` |
| Auteur | Prénom + initiale / display name user |
| Catégorie / statut / stockage | labels `project-enum-labels` |
| Attachment orphelin | « Document retiré du projet » |

---

## 7. Lots d’implémentation

| Lot | Contenu | Débloque |
| --- | --- | --- |
| **P0** | Upload + download API + tests isolation | INT-009 déjà OK ; UI peut brancher |
| **P1** | Onglet Documents + modal ajout + table + empty/loading/error | NTH.3 / mock silo |
| **P2** | `ProjectDocumentPicker` unifié + branchement Points (agenda, attachments, séance) | CDC « Lier un support » |
| **P3** | Activité (audit feed) + polish mobile + menu ⋯ | Rail mock |
| **P4** | Meetings picker + doc inventaire + LIAISONS `docs-project=live` | Cohérence transverse |

Critère « RFC livrée » : **P0+P1+P2**. P3/P4 peuvent suivre sans bloquer.

---

## 8. Tests

### Backend

- Upload client A → invisible client B / autre projet  
- `storageKey` avec `..` rejeté  
- MIME / taille rejetés  
- Download soft-deleted → 404  
- Create EXTERNAL sans URL → 422 ; STARIUM sans file → 422  

### Frontend

- Onglet : loading / empty / error / success  
- Modal upload + lien  
- Picker : options labellisées ; upload-and-link invalide la query documents + attachments  
- Masquage CTA si pas `projects.update`  
- `pnpm audit:ui-ids` / `audit:modals`  

---

## 9. Conformité by design

### RGPD

- DCP : `uploadedByUserId`, éventuels noms dans filename ; **minimiser** — pas d’email dans audit payload.  
- Finalité : gouvernance documentaire projet / supports de séance.  
- Rétention : soft delete ; purge physique job ultérieur (hors V1) aligné rétention client.  
- Logs : pas de chemin complet utilisateur, pas de contenu fichier, pas d’URL externe complète si token query (tronquer).  
- Scope : `clientId` + `projectId` stricts.

### RGAA

- Table sémantique ; menu ⋯ clavier ; focus trap modales `StariumModal`.  
- Labels sur file input (« Sélectionner un fichier ») ; erreurs `aria-invalid` / `aria-describedby`.  
- Icônes type fichier + texte (PDF, Excel…) — couleur non seule.  
- `aria-live` sur toasts upload / erreurs.  
- `prefers-reduced-motion` sur timeline activité.

### Design System

- Tokens uniquement ; `FilterBar`, `Table`, `StariumModal`, `EmptyState` / `LoadingState` / `ErrorState`, `PageContainer` / workspace existant.  
- CTA pilule tokens `--control-*`.  
- Pas de hex mock (`--purple` Figma) → token sémantique ou neutre + libellé « Figma ».

### Sécurité

- Guards existants + permissions projets.  
- Validation MIME magique légère + extension (ne pas faire confiance au seul `Content-Type` client).  
- Path traversal impossible (service content).  
- Audit create/upload/archive/delete.  
- Pas de listing cross-project via attachment forgé (`documentId` doit appartenir au même `projectId` + `clientId`).

### Interface mobile

- Onglet docs dès 320px : table → cartes empilées (nom, type, date, actions).  
- Rail activité sous segmented, pas colonne forcée.  
- Cibles ≥ 44px (CTA, ⋯, chips picker).  
- Modale centrée (norme Starium), pas bottom-sheet legacy.

---

## 10. Critères d’acceptation

1. Onglet **Documents** visible dans le workspace projet, aligné mock (liste + ajout).  
2. Upload STARIUM + téléchargement fonctionnels pour un user `projects.update` / `read`.  
3. Lien EXTERNAL créable et ouvrable.  
4. Depuis un point : lier un doc existant **ou** joindre un fichier qui apparaît **aussi** dans le silo.  
5. Aucun ID technique affiché ; soft-delete géré côté libellés.  
6. Isolation client prouvée par tests.  
7. INT-009 non régressé (fichiers uploadés syncables si opt-in).  
8. `docs-project` documenté **live** (ou partial→live à la fin P2).

---

## 11. Hors scope (explicite)

- GED transverse / partage multi-projets  
- Versionning / check-in-out / OCR  
- Dossiers imbriqués  
- Preview PDF/Office embarquée  
- Antivirus / DLP cloud  
- Création `storageType=MICROSOFT` depuis l’UI (badge lecture seule si sync)  
- Remplacer RFC-034 pièces Achats  

---

## 12. Prompt d’implémentation (P0+P1)

```text
Implémente RFC-PROJ-DOC-002 lots P0+P1.

Contraintes :
- Réutiliser ProjectDocument (DOC-001) ; enums Prisma inchangés
- clientId depuis ActiveClient ; jamais du body
- Upload multipart → write sous PROJECT_DOCUMENTS_STORAGE_ROOT/{clientId}/{projectId}/…
- storageKey généré serveur ; réutiliser ProjectDocumentContentService (étendre write)
- Download stream STARIUM ; EXTERNAL ouvert côté front
- Onglet workspace Documents (mock Refonte Portail Client) via StariumModal + FilterBar + Table
- Permissions projects.read / projects.update
- Tests isolation + path traversal + UI loading/empty/error
- Ne pas toucher INT-009 sauf invalidation query documents
- Picker unifié = lot P2 (ne pas le bâcler dans P1)
```

---

## 13. Récapitulatif / vigilance

| Risque | Mitigation |
| --- | --- |
| Deux UX documents (fiche + onglet) | Résumé fiche → lien onglet |
| Upload sans sync Teams | Documenter ; INT-009 reste opt-in |
| Attachments orphelins | Libellé métier + SetNull |
| DOC-FE-001 diverge | Marquée supersédée ; ne pas l’implémenter telle quelle |
| Grosses pièces | Cap 25 Mo + message clair |

**Prochaine étape naturelle après merge** : lot P2 picker partout (Points CDC), puis activité P3.
