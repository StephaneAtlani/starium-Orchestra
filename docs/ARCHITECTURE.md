# Starium Orchestra — Architecture technique

Document d’architecture technique de la plateforme SaaS de pilotage pour DSI à temps partagé.

---

## 1. Structure du repository

Organisation cible (monorepo ou repos séparés selon choix projet) :

```
starium-Orchestra/
├── backend/                 # NestJS API
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/          # guards, decorators, interceptors, pipes
│   │   ├── config/          # configuration (env, validation)
│   │   ├── prisma/          # PrismaService, helpers
│   │   ├── auth/            # JWT, refresh, stratégies
│   │   └── modules/         # modules métier (voir §6)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── test/
│   ├── Dockerfile
│   └── package.json
├── frontend/                # Next.js
│   ├── src/
│   │   ├── app/             # routes, layouts
│   │   ├── components/
│   │   ├── lib/
│   │   ├── services/       # appels API
│   │   ├── hooks/
│   │   ├── types/
│   │   └── features/       # optionnel, par feature
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml       # app + PostgreSQL + Redis + Nginx
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
- **Guards** : `JwtAuthGuard`, `RolesGuard`, et garde dédiée au contexte client (vérification que le `clientId` cible appartient à l’utilisateur).
- **Prisma** : unique point d’accès données ; pas de SQL brut sauf exception documentée.

### 2.3 Points d’entrée globaux

- Préfixe API : `/api` (ou `/api/v1` si versionnement).
- CORS, helmet, rate limiting configurés au niveau application.
- Pipeline : Auth → Client context → RBAC → Controller → Service → Prisma.

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

- **Token JWT** : contient `userId` et éventuellement la liste des `clientIds` autorisés (ou chargement en DB à chaque requête selon stratégie).
- **Guard client** : vérifie que l’endpoint reçoit un `clientId` (header `X-Client-Id` ou param) et que ce client est dans le scope de l’utilisateur.
- **Service** : reçoit le `clientId` validé ; toutes les requêtes Prisma sur des données métier incluent `where: { clientId }` (ou `clientId: { in: authorizedClientIds }` pour les listes).
- **API platform** : routes `/api/platform/*` réservées au platform admin (création clients, liste clients, affectation users).

### 4.4 Implémentation frontend

- Après login : récupération des clients accessibles (`GET /api/me/clients`).
- Sélection du client actif : `POST /api/me/active-client` ou simple stockage local + header sur chaque requête.
- Header / layout : affichage du client actif + switcher si plusieurs clients.
- Toutes les requêtes métier envoient le client actif (header recommandé).

---

## 5. Modèle de données principal

### 5.1 Entités noyau (multi-client et auth)

```
users
  id, email, passwordHash, name, ...
  (pas de clientId : utilisateur global)

clients
  id, name, slug, settings (jsonb), createdAt, ...

client_users
  id, userId, clientId, roleId, ...
  (table de liaison user ↔ client avec rôle)

roles
  id, name, clientId (null = rôle plateforme), ...

permissions
  id, name, resource, action, ...

role_permissions
  roleId, permissionId
```

- **Rôles** : soit globaux (ex. `platform_admin`), soit par client (ex. `client_admin`, `project_manager`). Les permissions sont attachées aux rôles.

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

- `budgets`, `budget_lines`
- `orders`, `order_lines`
- `suppliers`, `contracts`
- `cost_centers`, `analytical_axes`, `analytical_axis_values`
- `financial_allocations` (liaison commandes / contrats ↔ budgets)

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
**Modules métier** : budgets, projects, orders, suppliers, contracts, licenses, applications, etc.

Les modules métier dépendent du core (auth, clients, permissions) et du module Prisma. Pas de dépendances circulaires ; le noyau financier peut être un module `financial-core` importé par budgets, orders, contracts.

### 6.2 Frontend

- Les “modules” sont des zones fonctionnelles (routes + composants + services).
- Réutilisation de `components/` et `services/` partagés.
- Un dossier `features/<domain>/` peut regrouper composants et hooks par domaine (ex. `features/budgets`).

### 6.3 Dépendances

- Backend : core → métier ; financial-core utilisé par budgets, orders, contracts.
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
5. **Migrations** : Prisma migrate (en CI, vérification que les migrations sont applicables ; en déploiement, exécution contrôlée).

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

POST /api/platform/clients
GET /api/platform/clients

Budgets

GET /api/budgets
POST /api/budgets
GET /api/budgets/:id

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
