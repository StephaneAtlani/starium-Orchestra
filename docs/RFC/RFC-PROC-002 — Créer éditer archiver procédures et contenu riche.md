# RFC-PROC-002 — Créer, éditer, archiver des procédures et contenu riche

Version : 1.0 — 17 septembre 2026

| Métadonnée | Valeur |
| --- | --- |
| **Statut** | 🟡 En cours — **US-PROC-01** ✅ (socle create + list minimale + edit stub) · US-02…04 à venir |
| **Parent** | [RFC-PROC-001](./RFC-PROC-001%20—%20Module%20Procédures%20(cadrage%20et%20backlog%20user%20stories).md) |
| **Suite** | [PROC-003](./RFC-PROC-003%20—%20Versioning%20des%20procédures.md) · [PROC-004](./RFC-PROC-004%20—%20Export%20Word%20PDF%20procédures%20avec%20logo.md) |

---

## 1. Analyse de l'existant

Voir PROC-001 §1. Réutilisations prévues :

- patterns CRUD client-scoped (ex. `skills`, `contracts`) ;
- stockage dual local/S3 (RFC-035) pour `ProcedureAsset` ;
- `displayLabel` / réponses API avec `title` / `code` ;
- audit logs RFC-013.

---

## 2. User stories

### US-PROC-01 — Créer une procédure

**En tant qu’** utilisateur avec `procedures.create`,  
**je veux** créer une procédure rattachée au client actif,  
**afin de** démarrer la rédaction d’un document opérationnel gouverné.

#### Critères d’acceptation

1. Formulaire : **code** (unique par client), **titre**, **description** optionnelle, **catégorie** optionnelle (enum ou référentiel client V1 simple), **propriétaire** (utilisateur / ressource humaine — libellé métier, pas ID).
2. À la création : statut `DRAFT`, une version brouillon `1` (ou `0.1` — **hypothèse : entier `versionNumber` démarrant à 1 en DRAFT**).
3. Refus si code déjà utilisé sur le client (`409`).
4. Isolation : impossible de créer avec un `clientId` forgé ; dérivé du scope.
5. Audit `procedure.created`.
6. Redirect vers l’éditeur (`/procedures/[id]/edit`).

### US-PROC-02 — Éditer le contenu riche

**En tant qu’** utilisateur avec `procedures.update`,  
**je veux** rédiger le corps de la procédure avec texte, médias et hyperliens,  
**afin de** produire un document exploitable en lecture et à l’export.

#### Contenu supporté (V1)

| Type | Comportement |
| --- | --- |
| Texte structuré | Titres, paragraphes, listes, gras/italique, citations |
| Médias | Images uploadées (`ProcedureAsset`) ; pièces jointes téléchargeables (PDF) |
| Lien externe | URL `https://…` avec libellé ; ouverture nouvel onglet + `rel` sécurisé |
| Lien interne | Picker d’entité Orchestra (V1 : `Procedure`, `Project`, `ComplianceRequirement` si module actif) — stocke `resourceType` + `resourceId` + **label snapshot** ; UI affiche toujours le label (refresh label si entité encore lisible) |

#### Critères d’acceptation

1. Éditeur riche (hypothèse TipTap) ; payload = JSON ProseMirror validé côté API (schéma whitelist de nodes/marks).
2. Upload média : multipart, types MIME allowlist, taille max configurable, stockage scopé `clientId/procedures/:procedureId/…`.
3. Insertion image = node référencant `assetId` ; lecture via URL signée / endpoint autorisé `GET …/assets/:assetId`.
4. Lien interne : combobox avec **libellés métier** uniquement ; sauvegarde ID en interne.
5. Autosave ou CTA **Enregistrer** explicite + `aria-live` « Enregistré » / erreur.
6. Procédure `ARCHIVED` : contenu en **lecture seule** (sauf `unarchive` puis edit).
7. Sanitization : aucun `script`, aucun HTML arbitraire.
8. Audit `procedure.draft.updated` (résumé : versionId, taille contenu, pas le corps entier en clair si volumineux).

### US-PROC-03 — Archiver / désarchiver

**En tant qu’** utilisateur avec `procedures.archive`,  
**je veux** archiver une procédure obsolète et pouvoir la restaurer,  
**afin de** garder l’historique sans polluer le catalogue actif.

#### Critères d’acceptation

1. `POST …/archive` → `status=ARCHIVED`, `archivedAt`, `archivedByUserId`.
2. Catalogue par défaut : masque les archivées ; filtre « Inclure archivées ».
3. `POST …/unarchive` → retour `DRAFT` ou `PUBLISHED` selon dernière publication (**hypothèse : revenir au statut d’avant archivage stocké dans `statusBeforeArchive`**).
4. Archivage ≠ suppression des versions / assets.
5. Audit `procedure.archived` / `procedure.unarchived`.

### US-PROC-04 — Lister / filtrer / rechercher

**En tant qu’** utilisateur avec `procedures.read`,  
**je veux** parcourir le catalogue du client actif,  
**afin de** retrouver rapidement une procédure.

#### Critères d’acceptation

1. Liste paginée `{ items, total, limit, offset }`.
2. Filtres : statut, catégorie, recherche texte sur `title`/`code`.
3. Colonnes : code, titre, statut, version publiée courante (n° + date), propriétaire (libellé), mise à jour.
4. États loading / empty / error.
5. Responsive : cartes &lt; `md`.
6. Aucun ID technique visible (`pnpm audit:ui-ids`).

---

## 3. Hypothèses

1. Catégories V1 = enum fixe (`SECURITY`, `OPERATIONS`, `HR`, `IT_SERVICE`, `COMPLIANCE`, `OTHER`) — référentiel admin configurable = V2.
2. Vidéo native hors V1 (lien externe YouTube/Stream OK comme hyperlien).
3. Collaboration temps réel (CRDT) hors scope — last-write-wins + `updatedAt` optimistic lock (`If-Match` / `expectedUpdatedAt`).
4. Liens internes V1 limités aux 3 types ci-dessus ; extension catalogue via registre partagé type recherche globale (RFC-039) en V1.1.

---

## 4. Modèle Prisma (proposition)

```prisma
enum ProcedureStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum ProcedureCategory {
  SECURITY
  OPERATIONS
  HR
  IT_SERVICE
  COMPLIANCE
  OTHER
}

model Procedure {
  id                   String            @id @default(cuid())
  clientId             String
  code                 String
  title                String
  description          String?
  category             ProcedureCategory @default(OTHER)
  status               ProcedureStatus   @default(DRAFT)
  statusBeforeArchive  ProcedureStatus?
  ownerUserId          String?
  currentDraftVersionId String?
  currentPublishedVersionId String?
  archivedAt           DateTime?
  archivedByUserId     String?
  createdByUserId      String?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt

  client   Client              @relation(...)
  versions ProcedureVersion[]
  assets   ProcedureAsset[]

  @@unique([clientId, code])
  @@index([clientId, status])
  @@index([clientId, updatedAt])
}

model ProcedureVersion {
  id            String   @id @default(cuid())
  clientId      String
  procedureId   String
  versionNumber Int
  /// DRAFT | PUBLISHED (immuable si PUBLISHED — détail PROC-003)
  lifecycle     ProcedureVersionLifecycle
  title         String   // snapshot titre au moment de la version
  contentJson   Json
  changeSummary String?
  publishedAt   DateTime?
  publishedByUserId String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([procedureId, versionNumber])
  @@index([clientId, procedureId])
}

model ProcedureAsset {
  id           String   @id @default(cuid())
  clientId     String
  procedureId  String
  label        String
  mimeType     String
  sizeBytes    Int
  storageBucket String
  storageKey   String
  createdByUserId String?
  createdAt    DateTime @default(now())

  @@index([clientId, procedureId])
}
```

---

## 5. Endpoints (détail)

| Méthode | Route | Perm | Notes |
| --- | --- | --- | --- |
| GET | `/api/procedures` | read | query: status, category, q, limit, offset |
| POST | `/api/procedures` | create | body: code, title, description?, category?, ownerUserId? |
| GET | `/api/procedures/:id` | read | + draft summary + published summary + ownerLabel |
| PATCH | `/api/procedures/:id` | update | métadonnées (pas le body riche) |
| PATCH | `/api/procedures/:id/draft` | update | `{ contentJson, expectedUpdatedAt?, title? }` |
| POST | `/api/procedures/:id/assets` | update | multipart |
| GET | `/api/procedures/:id/assets/:assetId` | read | stream / redirect signé |
| DELETE | `/api/procedures/:id/assets/:assetId` | update | soft ou hard si non référencé |
| POST | `/api/procedures/:id/archive` | archive | |
| POST | `/api/procedures/:id/unarchive` | archive | |
| GET | `/api/procedures/link-targets` | read | recherche libellés pour liens internes |

Réponses : toujours `code`, `title`, `ownerDisplayName`, `statusLabel` — **jamais** UUID comme libellé UI.

---

## 6. Frontend — fichiers cibles

- `apps/web/src/features/procedures/api/procedures.api.ts`
- `apps/web/src/features/procedures/lib/procedures-query-keys.ts`
- `apps/web/src/features/procedures/components/procedure-list.tsx`
- `apps/web/src/features/procedures/components/procedure-editor.tsx` (+ toolbar)
- `apps/web/src/features/procedures/components/procedure-internal-link-picker.tsx`
- `apps/web/src/app/(protected)/procedures/page.tsx`
- `apps/web/src/app/(protected)/procedures/[id]/page.tsx`
- `apps/web/src/app/(protected)/procedures/[id]/edit/page.tsx`

---

## 7. Tests

### Backend

- CRUD + isolation cross-client (lecture/écriture refusées).
- Unicité `(clientId, code)`.
- Validation `contentJson` (node interdit → 400).
- Archive / unarchive + filtre liste.
- Upload MIME refusé.
- Permissions manquantes → 403.

### Frontend

- Liste empty/loading/error.
- Picker lien interne n’affiche que des labels.
- `audit:ui-ids` vert sur feature.

---

## 8. Conformité by design

| Axe | Exigence |
| --- | --- |
| **RGPD** | Owner / auteurs = DCP minimales ; logs sans contenu nominatif ; assets privés ; droit d’effacement : anonymiser userIds, conserver procédure si obligation métier |
| **RGAA** | Labels champs, toolbar clavier, `aria-invalid` erreurs, live regions save |
| **DS** | Patterns Starium ; modales via `StariumModal` |
| **Sécurité** | Scope client, DTO, allowlist MIME, sanitize JSON doc, audit |
| **Mobile** | Liste cartes ; éditeur toolbar horizontale scrollable ; CTA ≥ 44px |

---

## 9. Points de vigilance

- Optimistic locking du brouillon indispensable.
- Assets orphelins : job de purge ou GC à la suppression de node image.
- Ne pas stocker d’URL absolue d’asset en dur dans `contentJson` (préférer `assetId`).

---

## 10. Récapitulatif

Cette RFC couvre **US-PROC-01 à 04** : cycle de vie CRUD + contenu riche + catalogue. Le versioning publication et l’export sont hors scope ici.
