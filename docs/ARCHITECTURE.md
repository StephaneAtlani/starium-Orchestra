# Starium Orchestra — Architecture technique

Document d’architecture technique de la plateforme SaaS de pilotage pour DSI à temps partagé.

---

## 1. Structure du repository

Organisation cible (monorepo ou repos séparés selon choix projet) :

```
starium-Orchestra/
├── apps/
│   ├── api/                 # NestJS API
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/      # guards, decorators, interceptors, pipes
│   │   │   ├── config/      # configuration (env, validation)
│   │   │   ├── prisma/      # PrismaService, helpers
│   │   │   ├── auth/        # JWT, refresh, stratégies
│   │   │   └── modules/     # modules métier (voir §6)
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                 # Next.js
│       ├── src/
│       │   ├── app/         # routes, layouts
│       │   ├── components/
│       │   ├── lib/
│       │   ├── services/    # appels API
│       │   ├── hooks/
│       │   ├── types/
│       │   └── features/    # optionnel, par feature
│       ├── public/
│       ├── Dockerfile
│       └── package.json
├── packages/                # types, config partagés
├── docker-compose.yml       # postgres + api(-dev) + web(-dev)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── VISION_PRODUIT.md
│   └── ...
├── .cursorrules
└── README.md
```

Conventions de nommage des dossiers : kebab-case pour les dossiers frontend si pertinent ; backend aligné sur les noms de modules NestJS.

---

## 2. Architecture backend

### 2.1 Stack et responsabilités

| Couche        | Technologie | Rôle |
|---------------|-------------|------|
| HTTP          | NestJS      | Contrôleurs, guards, pipes, DTOs |
| Métier        | Services    | Logique, validation client, orchestration |
| Données       | Prisma      | ORM, migrations, typage |
| Persistance   | PostgreSQL  | Données relationnelles |
| Cache / session | Redis    | Sessions, rate limiting, jobs si besoin |
| Auth          | JWT + refresh | Tokens, RBAC |

### 2.2 Organisation des couches

- **Controllers** : uniquement HTTP (params, body, query, réponses). Aucune logique métier ni accès DB direct.
- **Services** : logique métier, validation du scope client, appels Prisma. Réutilisables entre endpoints et éventuels jobs.
- **DTOs** : entrées/sorties typées avec `class-validator` sur tous les écritures.
- **Guards** : `JwtAuthGuard`, guard de contexte client (`ActiveClientGuard`), contrôle d’accès module (`ModuleAccessGuard`) et RBAC permissions (`PermissionsGuard`). Les guards “admin” (ex. `ClientAdminGuard`, `PlatformAdminGuard`) restent des couches dédiées selon le type de route.
- **Prisma** : unique point d’accès données ; pas de SQL brut sauf exception documentée.

### 2.3 Points d’entrée globaux

- Préfixe API : `/api` (ou `/api/v1` si versionnement).
- CORS, helmet, rate limiting configurés au niveau application.
- Pipeline (routes métier) : **Auth → Client context → Module access → RBAC permissions → Controller → Service → Prisma**.

Détail (routes métier scopées client) :

```
JwtAuthGuard
→ ActiveClientGuard (header X-Client-Id + ClientUser ACTIVE)
→ ModuleAccessGuard (Module.isActive + ClientModule ENABLED)
→ PermissionsGuard (UserRole → RolePermission → Permission)
→ Controller
→ Service
→ Prisma (toujours filtré par clientId)
```

Optimisation perf (RFC-012) :

- `PermissionsGuard` peut mettre en cache les permissions résolues **dans la requête** via `request.resolvedPermissionCodes?: Set<string>` (évite de recharger plusieurs fois dans la même requête).

### 2.4 Configuration

- Variables d’environnement via `@nestjs/config`, validation au démarrage.
- Pas de secrets en dur ; distinction dev/staging/production.

---

## 3. Architecture frontend

### 3.1 Stack et responsabilités

| Couche     | Technologie | Rôle |
|------------|-------------|------|
| Framework  | Next.js     | App Router, SSR/SSG si besoin, API routes éventuelles (proxy) |
| UI         | React + TypeScript | Composants, état |
| Style      | Tailwind + shadcn/ui | Design system, accessibilité |
| Données    | Services / fetch | Uniquement appels vers l’API backend |

### 3.2 Structure des dossiers

- **`app/`** : routes, layouts, pages ; pas de logique métier lourde.
- **`components/`** : composants réutilisables (présentation + composants métier légers).
- **`services/`** ou **`api/`** : fonctions qui appellent l’API (méthode unique pour chaque ressource).
- **`hooks/`** : logique réutilisable (client actif, auth, listes paginées).
- **`types/`** : interfaces TypeScript alignées sur les réponses API.
- **`features/`** (optionnel) : découpage par feature (ex. `budgets`, `contracts`) avec sous-composants et hooks dédiés.

### 3.3 Règles de données

- Toute donnée métier provient de l’API.
- Aucune règle métier critique dupliquée côté frontend (ex. calculs financiers = backend).
- Gestion explicite des états : loading, erreur, vide.

### 3.4 Contexte client

- Contexte React (ou store) pour le **client actif** (ID + libellé).
- Sélecteur de client dans le header pour les utilisateurs multi-clients.
- Chaque appel API inclut le client actif (header ou param selon convention backend).
- Aucun mélange de données de plusieurs clients sur une même vue métier (sauf écrans platform admin explicitement prévus).

---

## 4. Gestion multi-client

### 4.1 Concepts

| Concept | Description |
|--------|-------------|
| **Platform admin** | Super admin : crée les clients, gère les abonnements et paramètres plateforme. |
| **Client** | Organisation cliente (tenant). |
| **Client user** | Lien user ↔ client avec un rôle (admin client, lecteur, etc.). |
| **Contexte client actif** | Client sélectionné pour la session courante ; toutes les opérations métier sont scopées à ce client. |

### 4.2 Règles métier

- Un utilisateur peut appartenir à plusieurs clients (plusieurs `client_users`).
- Un admin client ne peut gérer que son client (pas de création de clients, pas d’accès aux autres clients).
- Toute entité métier est rattachée à un `clientId`.
- Toute requête métier filtre par les `clientId` autorisés pour l’utilisateur (liste dérivée des `client_users`).
- Toute écriture vérifie que le `clientId` cible est bien dans le scope de l’utilisateur ; ne jamais faire confiance à un `clientId` fourni par le client sans vérification.

### 4.3 Implémentation backend

- **Token JWT** : contient au minimum `userId` (`sub`) et éventuellement un `platformRole` global (`PLATFORM_ADMIN` \| null). Aucun rôle client n’est mis dans le token ; les rôles client sont toujours résolus via la table `client_users`.
- **Guard client** : vérifie que l’endpoint reçoit un `clientId` (header `X-Client-Id` ou param) et que ce client est dans le scope de l’utilisateur, avec un `ClientUser` de statut `ACTIVE`.
- **Service** : reçoit le `clientId` validé ; toutes les requêtes Prisma sur des données métier incluent `where: { clientId }` (ou `clientId: { in: authorizedClientIds }` pour les listes).
- **API platform** : routes `/api/platform/*` réservées au platform admin (création clients, liste clients, création d’utilisateurs globaux, affectation/désaffectation users ↔ clients).

### 4.4 Implémentation frontend (RFC-014-2)

- **AuthProvider** : gestion de la session (user, accessToken en mémoire, refreshToken en localStorage). Login, logout, refreshSession. Le logout vide **toujours** l’état local et le localStorage même si `POST /api/auth/logout` échoue (token expiré).
- **Bootstrap client** : une seule fonction partagée (`resolve-active-client`) reçoit les clients, `platformRole` et le client mémorisé ; elle retourne une décision (redirect, blocked, set-client). Utilisée après login et au chargement du layout protégé (refresh / accès direct).
- **Fetch authentifié** : un client unique (`authenticated-fetch` + hook `useAuthenticatedFetch`) injecte `Authorization`, applique le **contrat X-Client-Id** (jamais sur `/api/auth/*`, `/api/me`, `/api/me/clients`, `/api/platform/*`, `/api/clients` ; toujours sur routes métier). Sur 401 : un seul refresh puis retry ; si échec → clear session et redirection `/login`.
- **Routes** : `/login` (public), `/select-client`, `/no-client`, `/dashboard` et routes métier (protégées, client actif requis pour le métier). Layout protégé : guard auth, bootstrap une fois, puis App Shell.
- **Header** : affichage du client actif, switcher de client, bouton déconnexion.

---

## 5. Modèle de données principal

### 5.1 Entités noyau (multi-client et auth)

```
users
  id, email, passwordHash, firstName, lastName, platformRole?, ...
  (pas de clientId : utilisateur global)

clients
  id, name, slug, settings (jsonb), createdAt, ...

client_users
  id, userId, clientId, role, status, ...
  (table de liaison user ↔ client avec rôle et statut)
```

- **Rôles globaux** : encodés via `users.platformRole` (`PLATFORM_ADMIN` \| null).
- **Rôles client** : encodés via `client_users.role` (`CLIENT_ADMIN`, `CLIENT_USER`, …). Seul le statut `ACTIVE` ouvre l’accès aux routes métier client (`ActiveClientGuard`).

### 5.2 Entités métier (toutes scopées client)

Chaque entité métier porte un `clientId` et des index adaptés :

- `budgets`, `budget_lines`
- `projects`, `orders`, `order_lines`
- `suppliers`, `contracts`, `licenses`
- `applications`, `databases`, `domains`, `certificates`, etc.

Schéma générique pour une entité métier :

- `id` (UUID ou bigint)
- `clientId` (FK vers `clients`, index)
- champs métier
- `createdAt`, `updatedAt`
- éventuellement `createdBy`, `updatedBy` (userId)

### 5.3 Noyau financier partagé

Entités transverses réutilisables par plusieurs modules :

- `budgets`, `budget_lines`, `budget_exercises`, `budget_envelopes`
- `orders`, `order_lines`
- `suppliers`, `contracts`
- `cost_centers`, `analytical_axes`, `analytical_axis_values`
- `financial_allocations` (liaison source ↔ ligne budgétaire ; types : FORECAST, COMMITTED, CONSUMED, etc.)
- `financial_events` (événements financiers : COMMITMENT_REGISTERED, CONSUMPTION_REGISTERED, REALLOCATION_DONE, etc.)
- `budget_reallocations` (RFC-017 : transfert entre deux BudgetLine d’un même budget ; crée 2 FinancialEvent REALLOCATION_DONE et déclenche le recalcul)
- `budget_version_sets` (RFC-019 : ensembles de versions ; baseline, révisions, version active ; chaque version = copie Budget + BudgetEnvelope + BudgetLine, sans clonage des allocations/événements)

Le **module backend `budget-management`** (RFC-015-2) implémente le CRUD de la structure budgétaire : exercices, budgets, enveloppes et lignes budgétaires. Il ne gère pas les allocations ni les événements financiers.

Le **module backend `financial-core`** (RFC-015-1B) implémente :
- les API d’allocations et d’événements financiers ;
- le recalcul centralisé des montants d’une `BudgetLine` (forecast, committed, consumed, remaining).

Les entités `BudgetExercise`, `Budget`, `BudgetEnvelope`, `BudgetLine` sont créées via l’API budget-management (ou manuellement / seed). Voir [docs/modules/budget-mvp.md](modules/budget-mvp.md).

### 5.4 Configuration admin (optionnel mais recommandé)

Tables de configuration pilotées par l’admin studio, par client ou globales :

- `admin_modules`, `admin_module_fields`, `admin_field_options`
- `admin_reference_lists`, `admin_reference_values`
- `admin_statuses`, `admin_workflows`, `admin_workflow_steps`
- `admin_views`, `admin_dashboard_widgets`, `admin_notifications`

---

## 6. Organisation des modules

### 6.1 Backend (NestJS)

Chaque module vit sous `src/modules/<module-name>/` :

- `<module-name>.module.ts`
- `<module-name>.controller.ts`
- `<module-name>.service.ts`
- `dto/` (create, update, query)
- `guards/` ou `policies/` si spécifiques
- `tests/`

**Modules partagés (core)** : auth, users, clients, client-users, roles, permissions, audit-logs, notifications, documents, config (admin).  
**Modules métier** : **budget-management** (CRUD exercices, budgets, enveloppes, lignes budgétaires — RFC-015-2), **financial-core** (noyau financier : allocations, événements, recalcul des lignes), **budget-reallocation** (RFC-017 : transfert budgétaire entre deux lignes d’un même budget, traçable et auditée), **budget-reporting** (RFC-016 : agrégations et KPI budgétaires en lecture seule — exercice, budget, enveloppe), **budget-snapshots** (RFC-015-3 : snapshots budgétaires), **budget-import** (RFC-018 : import Excel/CSV, mapping colonnes, preview, execute, traçabilité BudgetImportRowLink), **budget-versioning** (RFC-019 : BudgetVersionSet, baseline, révisions, version active, comparaison entre versions ; duplication Budget/Envelope/Line sans allocations/événements), projects, orders, suppliers, contracts, licenses, applications, etc.

Les modules métier dépendent du core (auth, clients, permissions) et du module Prisma. Pas de dépendances circulaires. Le module **budget-management** gère la structure budgétaire ; le module **financial-core** expose les API allocations/événements et le recalcul des lignes (sur des lignes créées via budget-management ou en base), et prend en charge les événements REALLOCATION_DONE pour la base budgétaire effective ; le module **budget-reallocation** crée des réallocations (BudgetReallocation + 2 FinancialEvent) et déclenche le recalcul des deux lignes. Le module **budget-reporting** consomme les données BudgetExercise, Budget, BudgetEnvelope, BudgetLine en lecture seule pour exposer des synthèses et KPI (totaux, ratios, alertes, répartition RUN/BUILD). Le module **budget-import** permet d’importer des lignes budgétaires depuis un fichier (XLSX/CSV) : analyse, mapping, prévisualisation, exécution transactionnelle avec anti-doublon (externalId ou clé composite) et traçabilité via BudgetImportRowLink. Le module **budget-versioning** gère les ensembles de versions (création baseline depuis un budget non versionné, révisions, activation, archivage, historique, comparaison entre versions).

### 6.2 Frontend

- Les “modules” sont des zones fonctionnelles (routes + composants + services).
- Réutilisation de `components/` et `services/` partagés.
- Un dossier `features/<domain>/` peut regrouper composants et hooks par domaine (ex. `features/budgets`).

### 6.3 Dépendances

- Backend : core → métier ; budget-management (structure budgétaire), financial-core (allocations/événements), budget-reallocation (transferts entre lignes), budget-reporting (lecture seule, agrégations KPI), budget-import (import Excel/CSV, mapping, preview, execute), budget-versioning (RFC-019 : versioning et comparaison) ; orders, contracts consomment le noyau financier.
- Frontend : pas de dépendances entre features si possible ; dépendance commune vers `services/api` et contexte client.

---

## 7. Gestion des logs

### 7.1 Logs d’application

- **Niveaux** : error, warn, info, debug (configurable par env).
- **Format** : JSON en production (pour agrégation), lisible en dev.
- **Contenu** : timestamp, level, message, context (module), traceId/correlationId si disponible, pas de données sensibles (pas de mots de passe, tokens complets, PII en clair).

Utilisation du logger NestJS ou Pino intégré à Nest ; même logger dans tous les modules.

### 7.2 Audit log (métier)

- **Objectif** : traçabilité des actions sensibles (qui, quoi, quand, sur quelle entité, quel client).
- **Stockage** : table `audit_logs` (userId, clientId, action, resourceType, resourceId, oldState/newState résumé, ip, userAgent si utile).
- **Déclenchement** : depuis les services après création/modification/suppression d’entités critiques (budgets, contrats, rôles, affectations client, etc.).
- **Conservation** : politique de rétention définie (ex. 1 an) ; possibilité d’export ou archivage.

### 7.3 Logs d’accès et sécurité

- Login / logout, échecs d’auth, changements de mot de passe : loggés (au minimum en audit ou log applicatif).
- Requêtes échouées (401/403) : log niveau warn avec contexte (userId, path, clientId si pertinent).

---

## 8. Stratégie CI/CD

### 8.1 Pipeline de base

1. **Lint** : ESLint (backend + frontend).
2. **Types** : `tsc --noEmit` (backend + frontend).
3. **Tests** : unitaires (services, guards) + tests d’API (controllers) ; frontend : tests des parcours critiques et du switcher client.
4. **Build** : backend `nest build`, frontend `next build`.
5. **Migrations** : Prisma migrate (en CI, vérification que les migrations sont applicables ; en déploiement, exécution contrôlée). En dev, `pnpm prisma:seed` depuis `apps/api` pour créer l’utilisateur de test d’authentification (voir README). Le seed applique aussi les **profils par défaut** (rôles prédéfinis) à tous les clients existants — voir [docs/default-profiles.md](default-profiles.md).

### 8.2 Environnements

- **Dev** : local avec Docker (PostgreSQL + Redis) ; backend et frontend en dev.
- **Staging** : déploiement automatique (branche `develop` ou `staging`) ; données de test.
- **Production** : déploiement depuis `main` (ou tags) ; manuel ou auto après revue.

### 8.3 Build et déploiement

- **Images Docker** : une image backend (Node), une image frontend (Node pour build puis Nginx ou Node pour serve), PostgreSQL et Redis soit managés soit via Docker.
- **Nginx** : reverse proxy (frontend + API backend), SSL, éventuellement cache statique.
- **Secrets** : variables d’environnement ou vault ; jamais dans le code ni dans l’image.

### 8.4 Bonnes pratiques

- Branches courtes ; PR obligatoires pour `main`/`develop`.
- Les tests d’isolation client et de permissions sont exécutés à chaque pipeline.
- Migrations Prisma versionnées et rejouables ; pas de migration destructive sans procédure documentée.

---
## 9. Design des APIs

Toutes les fonctionnalités métier sont exposées via des APIs REST.

**Documentation détaillée des endpoints (auth, me, users) :** [docs/API.md](API.md) — formats de requête/réponse, guards, erreurs.

Préfixe global :

/api

Exemples d’endpoints :

Authentification

POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout

Utilisateurs

GET /api/me
GET /api/me/clients

Clients (platform admin)

GET /api/clients
POST /api/clients

Budgets et noyau financier

Structure budgétaire (RFC-015-2)

GET/POST /api/budget-exercises, GET/PATCH /api/budget-exercises/:id
GET/POST /api/budgets, GET/PATCH /api/budgets/:id
GET/POST /api/budget-envelopes, GET/PATCH /api/budget-envelopes/:id
GET/POST /api/budget-lines, GET/PATCH /api/budget-lines/:id

Noyau financier — RFC-015-1B

GET /api/financial-allocations, POST /api/financial-allocations
GET /api/financial-events, POST /api/financial-events
GET /api/budget-lines/:id/allocations, GET /api/budget-lines/:id/events

Réallocations budgétaires — RFC-017

POST /api/budget-reallocations
GET /api/budget-reallocations
GET /api/budget-reallocations/:id

Reporting budgétaire — RFC-016

GET /api/budget-reporting/exercises/:id/summary
GET /api/budget-reporting/exercises/:id/budgets
GET /api/budget-reporting/budgets/:id/summary
GET /api/budget-reporting/budgets/:id/envelopes
GET /api/budget-reporting/budgets/:id/breakdown-by-type
GET /api/budget-reporting/envelopes/:id/summary
GET /api/budget-reporting/envelopes/:id/lines

Budget Data Import — RFC-018

POST /api/budget-imports/analyze
POST /api/budget-imports/preview
POST /api/budget-imports/execute
GET /api/budget-import-mappings
POST /api/budget-import-mappings
GET /api/budget-import-mappings/:id
PATCH /api/budget-import-mappings/:id
DELETE /api/budget-import-mappings/:id

Budget Versioning — RFC-019

GET /api/budget-version-sets
GET /api/budget-version-sets/:id
POST /api/budgets/:id/create-baseline
POST /api/budgets/:id/create-revision
POST /api/budgets/:id/activate-version
POST /api/budgets/:id/archive-version
GET /api/budgets/:id/version-history
GET /api/budgets/:id/compare?targetBudgetId=...

Projets

GET /api/projects
POST /api/projects
GET /api/projects/:id

Fournisseurs

GET /api/suppliers
POST /api/suppliers

Contrats

GET /api/contracts
POST /api/contracts

Licences

GET /api/licenses
POST /api/licenses

---

## Références

- [VISION_PRODUIT.md](./VISION_PRODUIT.md) — objectifs et périmètre produit
- [.cursorrules](../.cursorrules) — règles de développement et conventions du projet
