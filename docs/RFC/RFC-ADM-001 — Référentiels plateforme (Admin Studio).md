# RFC-ADM-001 — Référentiels plateforme (Admin Studio)

## Statut

📝 Draft

## Priorité

Haute — fondation Admin Studio / configurabilité plateforme

## Dépendances

- [RFC-014 — Admin Studio](./RFC-014%20%E2%80%94%20Admin%20Studio.md) — zone `/admin/*`, `PLATFORM_ADMIN`
- [RFC-013 — Audit logs](./RFC-013%20%E2%80%94%20Audit%20logs.md) — traçabilité des mutations
- [RFC-014-1](./RFC-014-1%20%E2%80%94%20UX-UI%20et%20Design%20System%20de%20l%E2%80%99application.md) / `docs/FRONTEND_UI-UX.md` — patterns UI
- `docs/ARCHITECTURE.md` §4 — routes `/api/platform/*` sans `ActiveClientGuard`
- `.cursorrules` — tables cibles `admin_reference_lists` / `admin_reference_values`

## Hors dépendances (ne pas fusionner)

- Référentiels **métier client-scopés** déjà livrés (compétences, org, tags projet, catégories fournisseur, etc.)
- Catalogue **types d’occasion snapshot** ([RFC-033](./RFC-033%20%E2%80%94%20Mise%20en%20place%20des%20versions%20budg%C3%A9taires%20(produit).md)) — modèle dédié conservé ; peut être **référencé** depuis le hub UI, pas migré dans V1

---

## 1. Analyse de l’existant

### 1.1 Constat produit

Starium prévoit des **listes de référence configurables** (`admin_reference_lists` / `admin_reference_values` dans `.cursorrules`). Aujourd’hui :

| Capacité | État |
| --- | --- |
| Admin Studio (`/admin/*`) | Partiel (RFC-014) — clients, users, audit, settings dispersés |
| CRUD générique « référentiel + valeurs » | **Absent** (pas de modèle Prisma `AdminReference*`) |
| Catalogues plateforme ad hoc | Ex. `/admin/snapshot-occasion-types` + `GET\|POST\|PATCH\|DELETE /api/platform/budget-snapshot-occasion-types` (`PlatformAdminGuard`) |
| Nav Platform | Pas d’entrée « Référentiels » dans `apps/web/src/config/navigation.ts` |
| Lecture côté modules métier | Pas d’API unique `GET …/reference-lists/:code/values` |

### 1.2 Patterns réutilisables

- **Guards plateforme** : `JwtAuthGuard` + `PlatformAdminGuard` (cf. `platform-budget-snapshot-occasion-types.controller.ts`, login-news, chatbot).
- **Archivage logique** : `archivedAt` + endpoint `…/archive` / `…/restore` (chatbot, skills, org).
- **UI Admin** : `PageContainer` + `PageHeader` + table + `StariumModal` ; gate `user.platformRole === 'PLATFORM_ADMIN'`.
- **Audit** : actions `*.created` / `*.updated` / `*.archived` / `*.restored` (RFC-013).

### 1.3 Objectif de cette RFC

Donner au **PLATFORM_ADMIN** un écran Admin Studio pour **créer, modifier et archiver** des **référentiels plateforme** (listes + valeurs), avec API REST dédiée, sans logique métier dans l’UI.

---

## 2. Hypothèses éventuelles

À valider si besoin avant implémentation :

| # | Hypothèse | Décision V1 |
| --- | --- | --- |
| H1 | Un référentiel = une **liste** (`code` stable) + N **valeurs** (`code` + `label`) | Oui |
| H2 | Scope V1 = **plateforme uniquement** (`clientId` absent) — pas d’override client | Oui ; override client = V2 |
| H3 | Archivage **logique** uniquement (pas de DELETE physique des listes / valeurs) | Oui |
| H4 | Les listes `isSystem = true` (seed) : code immuable ; archivage possible mais restauration réservée PLATFORM_ADMIN | Oui |
| H5 | Lecture runtime pour apps authentifiées : valeurs **actives** d’une liste non archivée, par `code` | Oui (endpoint lecture) |
| H6 | Ne remplace **pas** les référentiels métier dédiés (Skill, OrgUnit, BudgetSnapshotOccasionType, …) | Oui — moteur générique pour listes sans schéma dédié |
| H7 | `moduleKey` optionnel (ex. `budgets`, `projects`) pour filtrer / documenter l’usage — **pas** un ModuleAccessGuard sur les routes plateforme | Oui |
| H8 | Pas de hiérarchie de valeurs (pas d’arbre) en V1 | Oui |

---

## 3. Liste des fichiers à créer / modifier

### Documentation

- `docs/RFC/RFC-ADM-001 — Référentiels plateforme (Admin Studio).md` (ce document)
- `docs/RFC/_RFC Liste.md` — index
- `docs/API.md` — section endpoints (à la livraison)
- `docs/ARCHITECTURE.md` — mention module `platform-reference-lists` (à la livraison)

### Prisma

- `apps/api/prisma/schema.prisma` — modèles + enums
- `apps/api/prisma/migrations/<ts>_platform_reference_lists/` — migration
- `apps/api/prisma/seed.ts` — listes système optionnelles (ex. exemples non bloquants)

### Backend

- `apps/api/src/modules/platform-reference-lists/platform-reference-lists.module.ts`
- `apps/api/src/modules/platform-reference-lists/platform-reference-lists.controller.ts` — admin CRUD
- `apps/api/src/modules/platform-reference-lists/platform-reference-lists-read.controller.ts` — lecture runtime
- `apps/api/src/modules/platform-reference-lists/platform-reference-lists.service.ts`
- `apps/api/src/modules/platform-reference-lists/dto/*.ts`
- `apps/api/src/modules/platform-reference-lists/*.spec.ts`
- `apps/api/src/app.module.ts` — import module

### Frontend

- `apps/web/src/app/(protected)/admin/reference-lists/page.tsx` — liste des référentiels
- `apps/web/src/app/(protected)/admin/reference-lists/[listId]/page.tsx` — détail + valeurs
- `apps/web/src/features/platform-reference-lists/` — `api/`, `components/`, `hooks/`, types
- `apps/web/src/config/navigation.ts` — item Platform « Référentiels »
- Lien dashboard `/admin/dashboard` (carte / CTA)

---

## 4. Implémentation (spec)

### 4.1 Modèle de données

```prisma
enum AdminReferenceListStatus {
  ACTIVE
  ARCHIVED
}

model AdminReferenceList {
  id          String                    @id @default(cuid())
  /// Code technique stable (UPPER_SNAKE), unique plateforme.
  code        String                    @unique
  name        String
  description String?
  /// Module métier documentaire (ex. "budgets") — pas un FK Module.
  moduleKey   String?
  isSystem    Boolean                   @default(false)
  status      AdminReferenceListStatus  @default(ACTIVE)
  sortOrder   Int                       @default(0)
  archivedAt  DateTime?
  createdAt   DateTime                  @default(now())
  updatedAt   DateTime                  @updatedAt

  values AdminReferenceValue[]

  @@index([status, sortOrder])
  @@index([moduleKey])
}

model AdminReferenceValue {
  id          String    @id @default(cuid())
  listId      String
  /// Code stable au sein de la liste (UPPER_SNAKE).
  code        String
  label       String
  description String?
  sortOrder   Int       @default(0)
  isActive    Boolean   @default(true)
  archivedAt  DateTime?
  /// Métadonnées optionnelles (couleur token, icône Lucide, flags) — JSON borné.
  metadata    Json?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  list AdminReferenceList @relation(fields: [listId], references: [id], onDelete: Restrict)

  @@unique([listId, code])
  @@index([listId, isActive, sortOrder])
  @@index([listId, archivedAt])
}
```

Règles :

- `code` liste / valeur : `[A-Z][A-Z0-9_]{1,63}` (normalisation uppercase côté service).
- Archivage liste → `status = ARCHIVED`, `archivedAt = now()` ; les valeurs restent en base ; la lecture runtime **ignore** les listes archivées.
- Archivage valeur → `isActive = false`, `archivedAt = now()`.
- Restauration inverse les champs.
- Suppression physique : **hors V1**.
- `isSystem` : interdit de changer `code` ; interdit `DELETE` ; archive autorisée avec confirmation UI renforcée.

### 4.2 API — admin plateforme

Base : `/api/platform/reference-lists`  
Guards : `JwtAuthGuard` + `PlatformAdminGuard`  
Pas de `X-Client-Id` / `ActiveClientGuard`.

| Méthode | Route | Comportement |
| --- | --- | --- |
| `GET` | `/api/platform/reference-lists` | Liste paginée `{ items, total, limit, offset }` ; query `q`, `moduleKey`, `status`, `includeArchived` |
| `POST` | `/api/platform/reference-lists` | Créer liste (`code`, `name`, `description?`, `moduleKey?`, `sortOrder?`) |
| `GET` | `/api/platform/reference-lists/:listId` | Détail + compteurs valeurs (actives / archivées) |
| `PATCH` | `/api/platform/reference-lists/:listId` | Modifier `name`, `description`, `moduleKey`, `sortOrder` (pas `code` si `isSystem`) |
| `POST` | `/api/platform/reference-lists/:listId/archive` | Archiver liste |
| `POST` | `/api/platform/reference-lists/:listId/restore` | Restaurer liste |
| `GET` | `/api/platform/reference-lists/:listId/values` | Valeurs de la liste ; query `includeArchived`, `q` |
| `POST` | `/api/platform/reference-lists/:listId/values` | Créer valeur |
| `PATCH` | `/api/platform/reference-lists/:listId/values/:valueId` | Modifier `label`, `description`, `sortOrder`, `metadata` (pas `code` si liste `isSystem` **et** valeur seed — sinon `code` modifiable seulement si jamais référencé ; V1 : `code` immuable après création) |
| `POST` | `/api/platform/reference-lists/:listId/values/:valueId/archive` | Archiver valeur |
| `POST` | `/api/platform/reference-lists/:listId/values/:valueId/restore` | Restaurer valeur |

Réponses : toujours `code`, `name` / `label` (jamais un ID seul comme libellé). IDs techniques uniquement pour clés de mutation.

### 4.3 API — lecture runtime (consommateur)

Base : `/api/reference-lists`  
Guards : `JwtAuthGuard` (+ utilisateur authentifié ; **pas** de permission module dédiée en V1 — catalogue plateforme de lecture).

| Méthode | Route | Comportement |
| --- | --- | --- |
| `GET` | `/api/reference-lists/:code/values` | Valeurs **actives** de la liste **ACTIVE** ; 404 si liste inconnue ou archivée |
| `GET` | `/api/reference-lists/:code` | Métadonnées liste (`code`, `name`, `description`, `moduleKey`) si ACTIVE |

Forme options (selects UI) :

```json
{
  "items": [
    { "value": "<id>", "code": "HIGH", "label": "Élevé", "sortOrder": 10 }
  ]
}
```

L’UI affiche **`label`** ; soumet `code` ou `id` selon le contrat du module consommateur (préférer **`code` stable** pour les écritures métier quand c’est un référentiel générique).

### 4.4 DTOs (class-validator)

- `CreateAdminReferenceListDto` : `code`, `name` (required) ; `description?`, `moduleKey?`, `sortOrder?`
- `UpdateAdminReferenceListDto` : PartialType sans `code` pour listes système ; sinon `code` interdit en PATCH V1 (immuable après create)
- `CreateAdminReferenceValueDto` : `code`, `label` ; `description?`, `sortOrder?`, `metadata?` (objet JSON max profondeur 2, clés whitelistées côté service si besoin)
- `UpdateAdminReferenceValueDto` : `label?`, `description?`, `sortOrder?`, `metadata?`
- Query DTOs : `limit` (défaut 20, max 100), `offset`, `q`, filtres

### 4.5 Service — règles métier

1. Unicité `AdminReferenceList.code` globale.
2. Unicité `(listId, code)` sur valeurs.
3. Archive liste déjà archivée → idempotent 200.
4. Création / update valeur sur liste archivée → `409 Conflict`.
5. `metadata` : pas de DCP ; validation taille (ex. ≤ 4 Ko sérialisé).
6. Toute mutation → audit log.

### 4.6 Audit

| Action | Déclencheur |
| --- | --- |
| `admin_reference_list.created` | POST liste |
| `admin_reference_list.updated` | PATCH liste |
| `admin_reference_list.archived` | archive liste |
| `admin_reference_list.restored` | restore liste |
| `admin_reference_value.created` | POST valeur |
| `admin_reference_value.updated` | PATCH valeur |
| `admin_reference_value.archived` | archive valeur |
| `admin_reference_value.restored` | restore valeur |

Payload : ids + `code` / `name`/`label` (pas d’email ni autre DCP). `clientId` audit = `null` (action plateforme).

### 4.7 Frontend Admin Studio

#### Navigation

- Sidebar Platform : **Référentiels** → `/admin/reference-lists` (icône Lucide `Library` ou `ListTree`).
- Dashboard admin : CTA « Référentiels ».

#### Écran liste `/admin/reference-lists`

- `PageHeader` : titre « Référentiels plateforme », description courte.
- `FilterBar` : recherche, filtre module, statut (actifs / archivés / tous).
- Table : **Nom**, **Code** (mono, secondaire), **Module**, **Nb valeurs actives**, **Statut**, actions.
- CTA « Nouveau référentiel » → `StariumModal` (code, nom, description, moduleKey).
- Actions ligne : ouvrir détail, archiver / restaurer (confirm).
- États `LoadingState` / `EmptyState` / `ErrorState` + `aria-live` toasts.

#### Écran détail `/admin/reference-lists/[listId]`

- En-tête : **nom** + code en secondaire (jamais ID seul).
- Table des valeurs : label, code, ordre, statut.
- Modales create / edit valeur ; archive / restore.
- Interdit d’afficher un CUID comme texte principal (`displayLabel`, `pnpm audit:ui-ids`).

#### Permissions UI

- Gate `platformRole === 'PLATFORM_ADMIN'` (redirect `/dashboard` sinon) — miroir backend.

### 4.8 Consommation future (hors UI V1)

Les modules métier pourront :

```ts
const { items } = await authFetch('/api/reference-lists/PROJECT_PRIORITY/values');
// Select options: label visible, code soumis
```

Branchement concret des modules = RFC / tickets séparés (ne pas migruer Skill / Org / OccasionTypes ici).

---

## 5. Modifications Prisma

1. Ajouter enums + modèles §4.1.
2. Migration SQL : tables `AdminReferenceList`, `AdminReferenceValue` + indexes / unique.
3. Seed optionnel V1 (exemples documentaires, `isSystem: true`) — **zéro** seed obligatoire bloquant si vide acceptable.
4. Pas de `clientId` sur ces tables en V1.

---

## 6. Tests

### 6.1 Service

- CRUD liste + valeurs heureux.
- Doublon `code` liste → 409.
- Doublon `code` valeur → 409.
- Archive / restore idempotents.
- Write sur liste archivée → 409.
- Liste `isSystem` : refus changement `code`.
- Lecture runtime exclut listes / valeurs archivées.
- `metadata` trop volumineux → 400.

### 6.2 Contrôleur

- Non-PLATFORM_ADMIN → 403 sur `/api/platform/reference-lists*`.
- DTO invalide → 400.
- Lecture `/api/reference-lists/:code/values` : user JWT OK ; liste archivée → 404.

### 6.3 Frontend (smoke / vitest ciblés)

- Options / cellules affichent `label` / `name`, pas l’id.
- Gate PLATFORM_ADMIN.
- `audit:ui-ids` / `audit:modals` verts sur les nouveaux fichiers.

---

## 7. Récapitulatif final

| Livrable | Contenu |
| --- | --- |
| Spec | Cette RFC (Draft) |
| Backend | Module `platform-reference-lists` + lecture runtime |
| Prisma | `AdminReferenceList` / `AdminReferenceValue` |
| Frontend | `/admin/reference-lists` (+ détail), nav Platform |
| Sécurité | `PlatformAdminGuard` écriture ; JWT lecture ; audit |
| Non-goals V1 | Override client, hiérarchie, hard delete, migration des catalogues dédiés |

**Implémentation code** : hors scope de la rédaction de cette RFC — à planifier après validation Draft.

---

## 8. Points de vigilance

1. **Ne pas cannibaliser** les référentiels métier spécialisés — le moteur générique est pour listes plates sans schéma dédié.
2. **Stabilité des `code`** : une fois consommés par des modules, renommer un code casse les données — immuabilité après création + archive plutôt que rename.
3. **Hub UI** : on peut lister en lecture seule les catalogues ad hoc (occasion types) via liens, sans unifier le schéma en V1.
4. **V2 possible** : `clientId?` + fusion global/client (pattern RFC-033) si besoin d’overrides.
5. **`moduleKey`** informatif seulement — ne pas coupler à `ModuleAccessGuard` sur les routes plateforme.
6. **JSON `metadata`** : risque de dérive (couleurs en dur) — documenter whitelist (ex. `icon`, `tone` tokens) à l’implémentation.

---

## 9. Conformité by design

### RGPD

- **DCP** : aucune attendue (codes, libellés métier, descriptions). Interdit de stocker email / nom de personne dans `metadata`.
- **Finalité** : configuration de listes de valeurs pour l’UI et les modules.
- **Minimisation** : champs stricts §4.1.
- **Rétention / effacement** : archive logique ; purge physique hors V1 (job éventuel si liste jamais référencée).
- **Logs / audit** : codes + libellés ; pas de DCP en clair.
- **Scope** : données plateforme (pas de fuite inter-client — pas de `clientId`).

### RGAA

- Pages admin : un `h1` via `PageHeader` ; tables sémantiques ; actions clavier.
- Tous les champs de modale avec `<label>` ; erreurs `aria-invalid` + `aria-describedby`.
- Statut archivé : badge texte + variante (pas couleur seule).
- Toasts / résultats mutations : `aria-live`.
- `prefers-reduced-motion` respecté (DS existant).

### Design System

- Tokens / `.starium-*` ; `PageContainer`, `PageHeader`, `FilterBar`, `Table`, `LoadingState` / `EmptyState` / `ErrorState`.
- Modales via **`StariumModal`** uniquement.
- Libellés métier partout (`name`, `label`, `code` comme secondaire technique lisible — pas CUID).

### Sécurité

- Écriture : `PLATFORM_ADMIN` uniquement.
- Lecture runtime : utilisateur authentifié ; pas d’écriture.
- DTOs validés ; pas de `clientId` injectable.
- Audit sur toutes les mutations sensibles.
- Pas de sur-exposition : whitelist champs réponse.

### Interface mobile

- Layout fluide dès 320px ; tables → cartes empilées ou scroll horizontal contrôlé (`RFC-FE-MOB-002`).
- Cibles tactiles ≥ 44px (CTA, icônes action).
- Modales centrées (norme Starium) ; pas de dépendance au hover.

---

## 10. Critères d’acceptation

- [ ] PLATFORM_ADMIN peut **créer** un référentiel (liste) depuis `/admin/reference-lists`
- [ ] PLATFORM_ADMIN peut **modifier** nom / description / module / ordre
- [ ] PLATFORM_ADMIN peut **archiver** et **restaurer** un référentiel
- [ ] PLATFORM_ADMIN peut CRUD logique des **valeurs** (create / update / archive / restore)
- [ ] Endpoints `/api/platform/reference-lists*` protégés ; non-admin → 403
- [ ] `GET /api/reference-lists/:code/values` ne renvoie que valeurs actives d’une liste active
- [ ] Aucun ID technique comme libellé UI ; `pnpm audit:ui-ids` vert
- [ ] Modales via `StariumModal` ; `pnpm audit:modals` vert
- [ ] Audit émis sur create / update / archive / restore
- [ ] Tests service + contrôleur isolation / validation passent

---

## 11. Exemples d’API

### Créer un référentiel

```http
POST /api/platform/reference-lists
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "PROJECT_PRIORITY",
  "name": "Priorité projet",
  "description": "Niveaux de priorité portefeuille",
  "moduleKey": "projects",
  "sortOrder": 10
}
```

### Ajouter une valeur

```http
POST /api/platform/reference-lists/<listId>/values
Content-Type: application/json

{
  "code": "HIGH",
  "label": "Élevée",
  "sortOrder": 10
}
```

### Archiver

```http
POST /api/platform/reference-lists/<listId>/archive
```

### Lecture runtime

```http
GET /api/reference-lists/PROJECT_PRIORITY/values
Authorization: Bearer <token>
```

```json
{
  "items": [
    { "value": "clx…", "code": "HIGH", "label": "Élevée", "sortOrder": 10 }
  ]
}
```
