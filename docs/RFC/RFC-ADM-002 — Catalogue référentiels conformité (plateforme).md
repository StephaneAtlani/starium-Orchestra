# RFC-ADM-002 — Catalogue référentiels conformité (plateforme)

## Statut

✅ **Implémentée (MVP)** — 2026-09

Remplace le besoin mal cadré de [RFC-ADM-001](./RFC-ADM-001%20%E2%80%94%20R%C3%A9f%C3%A9rentiels%20plateforme%20(Admin%20Studio).md) (listes génériques, **abandonnée**).

---

## 1. Objectif

Permettre au **PLATFORM_ADMIN** de gérer les **cadres de conformité** (ISO, NIS2, RGPD, etc.) proposés à **tous les clients**, et permettre à un client d’**activer** (copier) un cadre dans son périmètre pour l’évaluer.

Source optionnelle d’enrichissement : bibliothèques YAML **CISO Assistant Community** (GitHub).

---

## 2. Modèle de données

`ComplianceFramework` :

| Champ | Rôle |
| --- | --- |
| `clientId = null` | Entrée du **catalogue plateforme** |
| `clientId = <client>` | Instance client (évaluations, preuves) |
| `archivedAt` | Archivage logique catalogue (non proposé à l’activation) |
| `isActive` | Désactivation soft sans archive |

`ComplianceRequirement` : exigences du cadre (copiées à l’activation).

Isolation : les évaluations / preuves restent **toujours** sur l’instance client ; jamais sur le cadre plateforme.

Migrations : `20260916190000_compliance_platform_catalog` (+ drop listes génériques `20260916213000_drop_platform_reference_lists`).

---

## 3. API

### Plateforme (`JwtAuthGuard` + `PlatformAdminGuard`, **sans** `X-Client-Id`)

| Méthode | Route | Comportement |
| --- | --- | --- |
| `GET` | `/api/platform/compliance/frameworks` | Liste catalogue ; `?includeArchived=true` |
| `GET` | `/api/platform/compliance/frameworks/:id` | Détail + exigences |
| `POST` | `/api/platform/compliance/frameworks` | Création manuelle |
| `PATCH` | `/api/platform/compliance/frameworks/:id` | Mise à jour |
| `POST` | `/api/platform/compliance/frameworks/:id/archive` | Archive |
| `POST` | `/api/platform/compliance/frameworks/:id/restore` | Restaure |
| `POST` | `/api/platform/compliance/frameworks/:id/requirements` | Ajoute une exigence |
| `GET` | `/api/platform/compliance/ciso-libraries` | Liste YAML GitHub (cache ~30 min) |
| `POST` | `/api/platform/compliance/ciso-libraries/import` | Body `{ paths: string[] }` (1–30) |

Import CISO : parse `objects.framework` + nœuds `assessable` ; skip si déjà `name`+`version` plateforme ou sans framework. Audit `createPlatform` (`source: ciso-assistant-community`).

### Client (`X-Client-Id` + module conformité + permissions)

| Méthode | Route | Permission | Comportement |
| --- | --- | --- | --- |
| `GET` | `/api/compliance/frameworks/catalog` | `compliance.read` | Cadres plateforme actifs non archivés |
| `POST` | `/api/compliance/frameworks/activate` | `compliance.create` | Body `{ platformFrameworkId }` — **copie** framework + exigences vers le client |

Détail routes métier client : `docs/API.md` (synthèses + module compliance existant).

---

## 4. UI

| Route | Rôle |
| --- | --- |
| `/admin/compliance-frameworks` | PLATFORM_ADMIN — catalogue, créer, archiver, **Importer** (modale recherche + cases à cocher) |
| `/compliance/frameworks` | Client — catalogue proposé + activation |

Nav Platform : **Référentiels conformité** uniquement (plus de « listes génériques »).

Libellés métier (`name`, `version`, `fileName`) — jamais d’ID brut affiché.

---

## 5. Code de référence

- `apps/api/src/modules/compliance/platform-compliance-frameworks.controller.ts`
- `apps/api/src/modules/compliance/platform-ciso-libraries.controller.ts`
- `apps/api/src/modules/compliance/ciso-library-import.service.ts` (+ `.spec.ts`)
- `apps/api/src/modules/compliance/compliance.service.ts` (`listPlatform*`, `activatePlatformFrameworkForClient`, `listProposedPlatformFrameworks`)
- `apps/web/src/app/(protected)/admin/compliance-frameworks/page.tsx`
- `apps/web/src/app/(protected)/compliance/frameworks/page.tsx`
- Seed catalogue : `apps/api/prisma/seed-platform-compliance-catalog.ts`

---

## 6. Conformité by design

### RGPD

- Pas de DCP dans le catalogue plateforme (noms / codes de cadres).
- Import : pas de log du contenu YAML complet ni d’identifiants utilisateurs en clair.
- Instances client : mêmes règles que le module conformité existant (évaluations / preuves scopées `clientId`).

### RGAA

- Modale import : `StariumModal`, labels sur recherche, cases à cocher avec `aria-label`, compteur `aria-live`, cibles ≥ 44 px.

### Design System

- `PageHeader`, `LoadingState` / `EmptyState` / `ErrorState`, `StariumModal`, tokens / classes `.starium-*`.

### Sécurité

- Écritures catalogue : `PLATFORM_ADMIN` uniquement.
- Activation : client actif validé + permissions ; copie isolée ; conflit 409 si déjà activé.
- Chemins import restreints à `backend/library/libraries/*.yaml` (pas de `..`).

### Mobile

- Actions `min-h-11`, liste import scrollable, tableau catalogue en overflow-x contrôlé.

---

## 7. Critères d’acceptation

- [x] PLATFORM_ADMIN liste / crée / archive des cadres `clientId = null`
- [x] Import CISO : liste + recherche + sélection + création exigences assessable
- [x] Client lit le catalogue et active une copie isolée
- [x] Pas de fuite inter-client sur les instances
- [x] RFC-ADM-001 / listes génériques retirées du produit
