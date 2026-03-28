Voici le **schéma fonctionnel mis à jour**, aligné avec ton architecture actuelle (`apps/api`, `apps/web`, multi-client strict, guards, budget-management, financial-core, reporting, import, versioning, etc.). 

---

# Schéma fonctionnel global — version mise à jour

## 1. Vue d’ensemble produit

```text
┌───────────────────────────────────────────────────────────────────────┐
│                           STARIUM ORCHESTRA                           │
│        Cockpit SaaS de pilotage budgétaire, financier et support      │
└───────────────────────────────────────────────────────────────────────┘

                 ┌────────────────────────────────────┐
                 │         DASHBOARD / COCKPIT        │
                 │ KPI, alertes, synthèses, widgets   │
                 └────────────────┬───────────────────┘
                                  │ drill-down
                                  ▼
┌───────────────────────────────────────────────────────────────────────┐
│                         BUDGET EXPLORER UI                            │
│         Budget → Enveloppes → Lignes budgétaires (navigation)         │
└────────────────┬───────────────────────────────┬──────────────────────┘
                 │ clic ligne                    │ navigation dédiée
                 ▼                               ▼
     ┌──────────────────────────┐     ┌──────────────────────────────┐
     │ Budget Line Drawer       │     │ Budget Line Detail Page      │
     │ (action rapide)          │     │ (analyse complète)           │
     │                          │     │                              │
     │ - KPI ligne              │     │ - KPI complets               │
     │ - overview               │     │ - allocations                │
     │ - commandes / factures   │     │ - events financiers          │
     │ - allocations            │     │ - historique / audit         │
     │ - timeline (RFC-FE-026)  │     │ - (timeline page future)     │
     │ - quick create           │     │ - lecture DAF / DSI          │
     └──────────────┬───────────┘     └──────────────┬───────────────┘
                    │                                │
                    └──────────────┬─────────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │        PROCUREMENT UI        │
                    │ suppliers / PO / invoices    │
                    │ recherche / filtres          │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │      PROCUREMENT CORE        │
                    │ Supplier / PurchaseOrder /   │
                    │ Invoice                      │
                    └──────────────┬───────────────┘
                                   │ si budgetLineId
                                   ▼
                    ┌──────────────────────────────┐
                    │       FINANCIAL CORE         │
                    │ FinancialEvent               │
                    │ FinancialAllocation          │
                    │ recalcul BudgetLine          │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │     BUDGET MANAGEMENT        │
                    │ Exercise / Budget / Envelope │
                    │ BudgetLine                   │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │ REPORTING / DASHBOARD API    │
                    │ synthèses / KPI / alertes    │
                    └──────────────────────────────┘
```

---

## 2. Schéma d’architecture applicative

```text
apps/
├── api/   → NestJS API
│   ├── auth / guards / permissions
│   ├── modules/
│   │   ├── budget-management
│   │   ├── financial-core
│   │   ├── budget-reporting
│   │   ├── budget-reallocation
│   │   ├── budget-import
│   │   ├── budget-versioning
│   │   ├── procurement
│   │   └── ...
│   └── prisma / PostgreSQL
│
└── web/   → Next.js frontend
    ├── app/ (routes, layouts)
    ├── components/ (UI partagée)
    ├── features/budgets
    ├── features/procurement
    ├── providers/ (auth, active client, query)
    └── lib/ (authenticated-fetch, api, utils)
```

Cette structure est bien celle documentée dans ton architecture technique. 

---

## 3. Pipeline d’accès backend

```text
Utilisateur
   ↓
Frontend Next.js
   ↓
authenticated-fetch
   ↓
Authorization + X-Client-Id
   ↓
API NestJS
   ↓
JwtAuthGuard
   ↓
ActiveClientGuard
   ↓
ModuleAccessGuard
   ↓
PermissionsGuard
   ↓
Controller
   ↓
Service
   ↓
Prisma
   ↓
PostgreSQL
```

C’est le pipeline métier standard décrit dans l’architecture, avec client actif obligatoire pour les routes métier. 

### 3.1 Modèle des rôles (global vs client actif)

Le modèle d’accès distingue deux niveaux de rôle :

- **Rôle global plateforme** : `User.platformRole` (`PLATFORM_ADMIN` ou `null`).
- **Rôle de rattachement client** : `ClientUser.role` (`CLIENT_ADMIN` ou `CLIENT_USER`) pour un client donné.

Règles d’architecture :

- Les routes **plateforme** pour gérer les organisations (`GET|POST /api/clients`, `PATCH|DELETE /api/clients/:id`, `/api/clients/:clientId/users`, …), ainsi que `/api/platform/*` et `/api/modules`, reposent sur `platformRole` + `PlatformAdminGuard` — **sans** `X-Client-Id` / `ActiveClientGuard`.
- Les routes sous **`/api/clients/active/*`** (identifiants Microsoft OAuth du client actif, paramètres fiscaux « client actif », etc.) reposent sur **`X-Client-Id`** + `ActiveClientGuard` comme le reste du métier client-scopé.
- Les autres routes métier client-scopées reposent sur `X-Client-Id` + `ActiveClientGuard` (puis `ClientAdminGuard` ou `PermissionsGuard` selon la ressource).
- `PLATFORM_ADMIN` ne confère pas automatiquement un rôle `CLIENT_ADMIN` sur un client.
- `CLIENT_ADMIN` ne confère pas automatiquement toutes les permissions métier (`budgets.*`, `projects.*`, etc.).

### 3.2 Routes `/api/me` — compte, identités e-mail, défaut par client

Plusieurs routes sous **`/api/me/*`** concernent le **compte utilisateur** (JWT) et **ne reposent pas** sur `X-Client-Id` ni `ActiveClientGuard` : profil, mot de passe, 2FA, avatar, **`GET /api/me/clients`**, **`PATCH /api/me/default-client`**, ainsi que :

- **`GET|POST|PATCH|DELETE /api/me/email-identities`** — gestion des adresses e-mail déclarées par l’utilisateur (`UserEmailIdentity`, module `apps/api/src/modules/me/`).
- **`PATCH /api/me/clients/:clientId/default-email-identity`** — définit l’identité e-mail par défaut **pour ce rattachement** (`ClientUser`), avec validation que le `clientId` correspond bien à un `ClientUser` du JWT et que l’identité appartient au même utilisateur et est **active**.

Règles de données :

- Les adresses supplémentaires sont stockées au niveau **`User`** ; le défaut **par client** est sur **`ClientUser.defaultEmailIdentityId`** (jamais sur `Client`). La FK vers l’identité est en **`onDelete: Restrict`** ; suppression ou désactivation bloquée côté métier si l’identité est encore utilisée comme défaut.
- `GET /api/me/clients` expose pour chaque client `defaultEmailIdentityId` et un objet `defaultEmailIdentity` minimal (affichage).

Côté frontend, `apps/web/src/lib/api-client.ts` exclut ces chemins de l’envoi automatique de `X-Client-Id` ; les requêtes TanStack Query utilisent les clés `['me', 'clients']` et `['me', 'email-identities']` (scope utilisateur, pas besoin de `clientId` dans la clé). Les routes **CRUD plateforme** sous `/api/clients` (hors `/api/clients/active/`) sont également exclues du header ; en revanche **`/api/clients/active/*` envoie `X-Client-Id`** (aligné sur `ActiveClientGuard`).

---

## 4. Schéma de données métier

### 4.0 Utilisateur, rattachement client et identités e-mail

```text
User
  ├── email (connexion)
  └── UserEmailIdentity[]  (email, emailNormalized, displayName, replyToEmail, isVerified, isActive)

ClientUser
  ├── userId, clientId, role, status, isDefault
  └── defaultEmailIdentityId?  →  UserEmailIdentity (même user ; contrainte métier vérifiée en service)
```

L’unicité des adresses « triviales » est portée par **`emailNormalized`** avec **`@@unique([userId, emailNormalized])`**.

### 4.1 Structure budgétaire

```text
BudgetExercise
   └── Budget
         └── BudgetEnvelope
               └── BudgetLine
```

C’est le noyau de `budget-management`. 

---

### 4.2 Noyau financier partagé

```text
BudgetLine
   ├── FinancialAllocation
   ├── FinancialEvent
   ├── PurchaseOrder
   └── Invoice
```

Avec la logique suivante :

* `PurchaseOrder` génère un `FinancialEvent` de type `COMMITMENT_REGISTERED`
* `Invoice` génère un `FinancialEvent` de type `CONSUMPTION_REGISTERED`
* `FinancialAllocation` porte les mouvements budgétaires internes
* `BudgetLine` est recalculée à partir des événements et allocations

Le document d’architecture confirme que `financial_allocations` et `financial_events` sont bien le noyau financier partagé réutilisable par plusieurs modules. 

---

### 4.3 Procurement Core

```text
Supplier
   ├── PurchaseOrder
   └── Invoice

PurchaseOrder
   ├── supplierId
   ├── budgetLineId?
   └── invoices[]

Invoice
   ├── supplierId
   ├── purchaseOrderId?
   └── budgetLineId?
```

---

## 5. Flux métier détaillés

### 5.1 Création d’une commande

```text
Utilisateur
   ↓
Drawer ou Procurement UI
   ↓
Choix fournisseur / quick-create
   ↓
POST /api/purchase-orders
   ↓
Create PurchaseOrder
   ↓
si budgetLineId présent
   ↓
Create FinancialEvent
type = COMMITMENT_REGISTERED
sourceType = PURCHASE_ORDER
   ↓
Recalcul BudgetLine
   ↓
Audit log
   ↓
Refresh UI
```

---

### 5.2 Création d’une facture

```text
Utilisateur
   ↓
Drawer ou Procurement UI
   ↓
Choix fournisseur / quick-create
   ↓
POST /api/invoices
   ↓
Create Invoice
   ↓
si budgetLineId présent
   ↓
Create FinancialEvent
type = CONSUMPTION_REGISTERED
sourceType = INVOICE
   ↓
Recalcul BudgetLine
   ↓
Audit log
   ↓
Refresh UI
```

---

### 5.3 Allocation budgétaire

```text
Utilisateur
   ↓
Drawer / détail ligne
   ↓
Création allocation
   ↓
FinancialAllocation
   ↓
Recalcul BudgetLine
   ↓
Impact forecast / remaining
```

---

### 5.4 Réallocation budgétaire

```text
Utilisateur
   ↓
POST /api/budget-reallocations
   ↓
Create BudgetReallocation
   ↓
Create 2 FinancialEvent REALLOCATION_DONE
   ↓
Recalcul des 2 BudgetLine
   ↓
Audit log
```

Le module `budget-reallocation` est bien explicitement prévu dans l’architecture consolidée. 

---

### 5.5 Suppression logique Procurement

```text
DELETE logique PurchaseOrder / Invoice
   ↓
Status = CANCELLED
   ↓
si budgetLineId présent
   ↓
Create FinancialEvent inverse (montant HT négatif)
   ↓
Recalcul BudgetLine
   ↓
Audit log
   ↓
Aucune suppression physique
```

Et pour `Supplier` :

```text
DELETE logique Supplier
   ↓
Status = ARCHIVED
   ↓
Audit log
   ↓
Aucune suppression physique
```

---

## 6. Schéma des écrans

### 6.1 Écrans existants / cibles

```text
/dashboard
   → cockpit global

/budgets
   → liste budgets

/budgets/[budgetId]
   → explorer budgets / enveloppes / lignes

/budget-envelopes/[id]
   → détail enveloppe

/budget-lines/[id]
   → détail complet ligne budgétaire

/budget-lines/[id]/edit
   → édition structurelle de la ligne

/procurement/suppliers
/procurement/purchase-orders
/procurement/invoices
   → gestion métier procurement
```

---

### 6.2 Rôle des écrans

```text
Edit page
   = modifier la structure

Drawer
   = agir vite

Detail page
   = comprendre / auditer

Dashboard
   = piloter globalement

Procurement pages
   = gérer fournisseurs / commandes / factures hors budget line
```

---

### 6.3 Budget Line Intelligence Drawer (web)

Implémenté dans `apps/web` — ouverture au clic sur une **ligne budgétaire** depuis l’explorer (`/budgets/[budgetId]`).

**Onglets** : Vue d’ensemble · Commandes · Factures · Allocations · **Timeline** · Infos DSI.

* **RFC-FE-026 (Timeline)** — frontend uniquement : fusion **strict multi-sources** (les 4 flux doivent réussir sinon erreur globale) :
  * `GET /api/budget-lines/:id/events`
  * `GET /api/budget-lines/:id/allocations`
  * `GET /api/budget-lines/:id/purchase-orders`
  * `GET /api/budget-lines/:id/invoices`  
  Clés React Query tenant-aware (`clientId`), normalisation dans `timeline-utils`, hook `useBudgetLineTimeline`.
* **UX panneau** : poignée en tête de panneau — clic pour **agrandir** le drawer jusqu’à `100dvh` (sm+) ou revenir à la hauteur réduite ; réinitialisation à la fermeture.
* **Tableaux d’événements** (onglets Commandes / Factures) : `BudgetLineEventsTable` — dates `fr-FR`, badges type/source, montants signés pour engagements / consommations.

La page dédiée `/budget-lines/[id]` (RFC-FE-005) reste une cible produit distincte ; la timeline V1 n’exige pas cette route.

---

## 7. Schéma des modules backend

```text
Core plateforme
├── auth
├── clients
├── users
├── roles / permissions
├── audit-logs
└── notifications

Core budgétaire / financier
├── budget-management
├── financial-core
├── budget-reporting
├── budget-reallocation
├── budget-import
├── budget-versioning
└── procurement

Autres domaines
├── projects
├── project-budget (RFC-PROJ-010 — liens Project ↔ BudgetLine)
├── microsoft (RFC-PROJ-INT-003 OAuth, RFC-PROJ-INT-004 client HTTP Graph)
├── contracts
├── licenses
├── applications
└── ...
```

**Module `projects` (MVP — RFC-PROJ-001)** : API `/api/projects` (+ tâches RFC-PROJ-011 avec liste paginée et **sans** `DELETE` tâche au MVP, **`GET|POST|PATCH|DELETE /api/projects/:projectId/task-buckets`** buckets planning `ProjectTaskBucket` + `bucketId` sur `ProjectTask`, **`GET /api/projects/:projectId/gantt`** tâches+jalons, **`/activities`**, risques (**RFC-PROJ-018** — `GET|POST|PATCH|DELETE /api/projects/:projectId/risks`), jalons, **fiche décisionnelle** `GET|PATCH /api/projects/:id/project-sheet`, **arbitrage legacy** `POST /api/projects/:id/arbitration`, **points projet** `GET|POST /api/projects/:projectId/reviews` et sous-routes RFC-PROJ-013 — types COPIL/COPRO/… et **POST_MORTEM** (REX, projet clos uniquement), pilotage calculé dans `projects-pilotage.service.ts`, sous-modules `project-sheet/` (fiche — RFC-PROJ-012 Project Sheet) et `project-reviews/` (RFC-PROJ-013), UI Next.js (`/projects`, détail projet avec onglet Points projet, **Planning Gantt** `/projects/[projectId]/planning` — RFC-PROJ-012 Gantt Tâches et Jalons, `apps/web/src/features/projects/components/project-gantt-panel.tsx`, **options par projet** `/projects/[projectId]/options` — RFC-PROJ-OPT-001, `apps/web/src/features/projects/options/` ; le chemin `/projects/options` sans id reste un **placeholder** module). Détail : [docs/modules/projects-mvp.md](modules/projects-mvp.md).

**Module `project-budget` (RFC-PROJ-010)** : API `/api/projects/:projectId/budget-links` (liste paginée) et `POST`, `/api/project-budget-links/:id` (`DELETE`), isolation `clientId`, invariants d’allocation sur les liens projet ↔ ligne budgétaire. Enregistré dans `app.module.ts` à côté de `ProjectsModule`.

**Module `microsoft` (RFC-PROJ-INT-003 / RFC-PROJ-INT-004 / RFC-PROJ-INT-005)** : OAuth délégué Microsoft 365, jetons stockés chiffrés (`MicrosoftConnection`). **Transport Microsoft Graph** : `MicrosoftGraphService` ([RFC-PROJ-INT-004](RFC/RFC-PROJ-INT-004%20—%20Microsoft%20Graph%20Service.md)) — requêtes vers `https://graph.microsoft.com/v1.0`, Bearer via `MicrosoftOAuthService.ensureFreshAccessToken` (ex. `requestForConnection`) ; **pas d’endpoint générique « Graph »** côté API : le client appelle des routes métier qui appellent le service. **Lien projet Microsoft** ([RFC-PROJ-INT-007](RFC/RFC-PROJ-INT-007%20—%20Lien%20projet%20Microsoft.md), [RFC-PROJ-INT-008](RFC/RFC-PROJ-INT-008%20—%20Sync%20t%C3%A2ches%20vers%20Planner.md), [RFC-PROJ-INT-009](RFC/RFC-PROJ-INT-009%20—%20Sync%20documents%20vers%20Teams.md)) : `GET|PUT /api/projects/:projectId/microsoft-link` (champ `useMicrosoftPlannerBuckets` pour importer les buckets Planner à la place des buckets Starium — voir RFC-PROJ-OPT-001), `POST .../sync-tasks`, `POST .../sync-documents` — contrôleurs dans `microsoft/`, isolation `projectId` + client actif ; la sync documents importe `ProjectsModule` pour `ProjectDocumentContentService` (fichiers STARIUM sur disque). Routes publiques existantes : `/api/microsoft/auth/url`, `/api/microsoft/auth/callback` (sans JWT ; `clientId` issu du `state` signé validé), `/api/microsoft/connection` ; **configuration plateforme** `GET|PATCH /api/platform/microsoft-settings` (redirect URI, scopes, timeouts — `PlatformAdminGuard`) ; **identifiants d’app Azure par client Starium** `GET|PUT /api/clients/active/microsoft-oauth` (`projects.update`, client admin ou équivalent). Repli **environnement** si la DB est vide. UI client : **Administration client** → `/client/administration/microsoft-365` (accès aligné sur l’API : **client admin** ou **`projects.update`** avec module Projets activé) ; UI plateforme : `/admin/microsoft-settings` (un utilisateur non–platform-admin y est **redirigé** vers `/client/administration/microsoft-365`). Code : `apps/api/src/modules/microsoft/`, `apps/web/src/features/microsoft-365/`, `apps/web/src/app/(protected)/admin/microsoft-settings/`.

L’architecture consolidée décrit bien ce découpage modulaire côté NestJS. 

---

## 8. Schéma de responsabilité frontend / backend

```text
Frontend
- navigation
- affichage
- formulaires
- état loading / error / empty
- appel API

Backend
- validation métier
- contrôle clientId
- RBAC
- calcul fiscal
- création events / allocations
- recalcul budget line
- audit log
- persistance
```

Le document d’architecture insiste explicitement sur le fait que le frontend ne porte aucune logique métier critique et que le backend reste source de vérité. 

---

## 9. Schéma Mermaid global

```mermaid
flowchart TD
    A[Dashboard UI] --> B[Budget Explorer]
    B --> C[Budget Line Drawer]
    B --> D[Budget Line Detail Page]
    D --> E[Budget Line Edit]

    C --> F[Procurement UI]
    D --> F

    F --> G[Supplier]
    F --> H[PurchaseOrder]
    F --> I[Invoice]

    H --> J[FinancialEvent COMMITMENT_REGISTERED]
    I --> K[FinancialEvent CONSUMPTION_REGISTERED]

    C --> L[FinancialAllocation]
    D --> L

    M[Budget Reallocation] --> N[FinancialEvent REALLOCATION_DONE]
    N --> O[BudgetLine Recalculation]

    J --> O
    K --> O
    L --> O

    O --> P[Budget Reporting API]
    P --> A
```

---

## 10. Schéma Mermaid technique

```mermaid
flowchart TD
    U[Utilisateur] --> W[Next.js Web App]
    W --> AF[authenticated-fetch]
    AF --> API[NestJS API]

    API --> G1[JwtAuthGuard]
    G1 --> G2[ActiveClientGuard]
    G2 --> G3[ModuleAccessGuard]
    G3 --> G4[PermissionsGuard]

    G4 --> CTRL[Controllers]
    CTRL --> SVC[Services]
    SVC --> PR[Prisma]
    PR --> DB[(PostgreSQL)]

    SVC --> AUDIT[Audit Logs]
    SVC --> FC[Financial Core]
    SVC --> BM[Budget Management]
    SVC --> BR[Budget Reporting]
    SVC --> PROC[Procurement]
```

---

## 11. Schéma ultra synthétique

```text
Dashboard
   ↓
Budget Explorer
   ↓
Budget Line
   ├── Drawer = agir
   ├── Detail page = comprendre
   ├── Edit page = modifier la structure
   └── Procurement = gérer le réel

Procurement / Allocations / Reallocation
   ↓
Financial Core
   ↓
BudgetLine recalculée
   ↓
Reporting / Dashboard
```

---

## 12. Conclusion fonctionnelle

Le fonctionnement cible mis à jour est donc :

* **Budget Management** structure le budget
* **Procurement** porte le réel métier (fournisseurs, commandes, factures)
* **Financial Core** reste la source unique de calcul
* **Budget Line** est l’objet central de lecture et de pilotage
* **Drawer** permet l’action rapide
* **Detail page** permet l’analyse complète
* **Dashboard / Reporting** fournissent la vision DG / DAF / DSI

Si tu veux, je peux maintenant te faire la **version diagramme premium**, propre pour Notion, Miro ou présentation CODIR, avec blocs plus lisibles et hiérarchie visuelle plus “executive”.
