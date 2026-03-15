# FRONTEND_ARCHITECTURE.md

## Architecture Frontend — Starium Orchestra

---

## 1. Objectif

Le frontend de **Starium Orchestra** est le **cockpit web de pilotage** de la plateforme.
Il permet à un utilisateur de :

* se connecter
* sélectionner un client actif
* accéder aux modules autorisés
* consulter des indicateurs et listes métier
* exécuter des actions via l’API backend

Le frontend ne porte **aucune logique métier critique**.
Le backend reste la **source de vérité** pour :

* l’authentification
* l’isolation client
* l’activation des modules
* les permissions RBAC
* les validations métier  

Principe fondamental :

```text
Frontend → API → Backend → Database
```

---

## 2. Rôle du frontend dans Starium Orchestra

Starium Orchestra est conçu comme une plateforme SaaS de **gouvernance opérationnelle** pour les DSI, DSI à temps partagé, directions et chefs de projet IT. Le produit centralise budgets, projets, fournisseurs, contrats, licences, équipes, actifs IT et documentation afin d’offrir une vision claire et consolidée du SI. 

Le frontend doit donc être pensé comme :

> **le cockpit du système d’information**

et non comme une simple succession de formulaires.

Il doit permettre :

* une navigation rapide entre modules
* une lecture claire des KPI
* une distinction stricte entre administration plateforme et travail métier par client
* une expérience homogène entre domaines fonctionnels

---

## 3. Principes d’architecture

### 3.1 API-first

Toute la logique métier est exposée via API et consommée par le frontend. 

Conséquences :

* aucune règle métier critique dans React
* aucun calcul métier “source de vérité” côté UI
* aucun accès direct aux données hors API backend

### 3.2 Multi-client natif

Un utilisateur peut appartenir à plusieurs organisations. Chaque donnée métier est isolée par client. 

Conséquences :

* le frontend récupère les clients accessibles après connexion
* l’utilisateur choisit un **client actif**
* toutes les requêtes métier envoient `X-Client-Id`
* aucun mélange de données de plusieurs clients sur un écran métier

### 3.3 Backend source de vérité

Le frontend peut masquer des actions, mais **seul le backend décide**. 

Conséquences :

* un bouton caché n’est jamais une sécurité
* toute erreur `401` / `403` doit être gérée proprement côté UI
* les permissions affichées sont des aides UX, pas une autorité d’accès

### 3.4 Modularité forte

Chaque domaine métier est isolé dans un module, avec des modules core partagés. 

Conséquences côté frontend :

* architecture par features
* composants partagés
* absence de dépendances circulaires entre domaines

### 3.5 Cockpit avant tout

L’interface doit être un espace de pilotage :

* navigation stable
* contexte visible
* informations synthétiques
* actions contextualisées
* lisibilité forte

---

## 4. Stack technique

Conforme à la documentation projet : **Next.js**, **TypeScript**, **Tailwind**, **shadcn/ui**. 

### Stack retenue

* **Next.js App Router**
* **React**
* **TypeScript**
* **Tailwind CSS v4** (avec **PostCSS** et `@tailwindcss/postcss`)
* **shadcn/ui** (style base-nova, primitives Base UI)
* **Lucide Icons** (`lucide-react`)
* **TanStack Query**
* **React Hook Form**
* **Zod**

### Tailwind v4 et PostCSS

* Fichier CSS principal : `src/app/globals.css` avec `@import "tailwindcss";`
* Configuration : `postcss.config.mjs` avec le plugin `@tailwindcss/postcss` (obligatoire pour que Tailwind compile les utilitaires)
* Thème : variables CSS dans `:root` et `@theme inline` pour exposer les couleurs au thème Tailwind

### Dépendances UI (shadcn / base-nova)

Les composants shadcn (base-nova) s’appuient sur :

* `@base-ui/react` — primitives (Button, Dialog, Input, Select, Tabs, Tooltip, etc.)
* `class-variance-authority` — variantes des composants
* `clsx` et `tailwind-merge` — utilitaire `cn()` pour les classes
* `lucide-react` — icônes

Ces paquets doivent être déclarés dans `apps/web/package.json`. Ajout de composants via le CLI shadcn : `npx shadcn@latest add <component>`.

### Pourquoi ces choix

* **Next.js** : structure applicative, layouts, server/client components
* **TypeScript** : cohérence des contrats
* **TanStack Query** : cache, invalidation, pagination, mutations
* **Zod** : validation côté formulaire et mapping sûr
* **shadcn/ui** : base UI cohérente et extensible

---

## 5. Modèle d’interface applicative

Le frontend repose sur un **App Shell** fixe.

```text
┌───────────────┬────────────────────────────────────┐
│ Logo          │ Header Workspace                   │
│ Sidebar       │ client actif / recherche / profil  │
│ Navigation    ├────────────────────────────────────┤
│               │                                    │
│               │            Workspace               │
│               │                                    │
│               │                                    │
└───────────────┴────────────────────────────────────┘
```

### Objectif de ce layout

Séparer clairement :

* la **navigation structurelle** à gauche
* le **contexte courant** en haut à droite
* le **contenu métier** dans le workspace

Ce modèle est le plus adapté à un SaaS cockpit.

---

## 6. App Shell

L’App Shell est la colonne vertébrale du frontend.

### Responsabilités

* afficher la sidebar
* afficher le header du workspace
* gérer la zone de contenu
* gérer la navigation globale
* injecter les providers applicatifs

### Structure logique

```tsx
<AppProviders>
  <AppShell>
    <Sidebar />
    <WorkspaceArea>
      <WorkspaceHeader />
      <main>{children}</main>
    </WorkspaceArea>
  </AppShell>
</AppProviders>
```

### Règle

Le shell est stable d’une page à l’autre.
Les pages métier ne reconstruisent jamais leur propre layout global.

---

## 7. Sidebar

La sidebar contient la navigation persistante.

### Contenu type

```text
Cockpit
- Dashboard

Pilotage
- Budgets
- Projects
- Suppliers
- Contracts
- Licenses

Référentiel IT
- Applications
- Databases
- Domains
- Certificates

Administration client
- Users
- Roles
- Permissions

Administration plateforme
- Admin Studio
- Clients
- Global Users
- Audit Logs
```

### Règles

* structure stable
* regroupement par domaine
* affichage selon scope et permissions
* état actif visible
* profil utilisateur en bas
* version mobile via drawer

### Important

La sidebar ne dépend pas uniquement de l’URL.
Elle dépend de :

* l’utilisateur connecté
* son `platformRole`
* le client actif
* les modules activés
* les permissions utiles à l’affichage

---

## 8. Header du workspace

Le header est limité à la zone droite.

### Contenu

* titre de page
* breadcrumbs
* switcher de client
* recherche globale
* notifications
* raccourcis d’action
* menu profil

### Exemple

```text
Budgets / Exercice 2026

[Client actif ▼]   [Recherche]   [Notifications]   [Profil]
```

### Règles

* le client actif est toujours visible
* les actions de page sont à droite
* le header ne porte pas de logique métier
* il expose uniquement le contexte courant

---

## 9. Workspace

Le workspace est la zone de travail métier.

### Structure recommandée d’une page

```text
PageHeader
KPI row (composant KpiCard dans components/ui/kpi-card.tsx : title, value, subtitle, trend?, icon?)
Toolbar (filtres, recherche, actions)
Contenu principal (table, cards, détails)
Pagination / résumé
```

### États obligatoires sur chaque page de données

* loading
* error
* empty
* success

Aucun écran métier ne doit afficher un “blanc vide” sans état explicite. 

---

## 10. Séparation des scopes

Le frontend distingue **deux scopes fonctionnels**.

### 10.1 Scope plateforme

Utilisé pour l’administration globale du SaaS.

Exemples :

* clients
* utilisateurs globaux
* audit global
* modules clients
* futurs paramétrages plateforme

Ces écrans correspondent à des routes backend protégées par `PlatformAdminGuard`. 

### 10.2 Scope client

Utilisé pour les modules métier d’une organisation.

Exemples :

* budgets
* projects
* suppliers
* contracts
* licenses
* users du client
* rôles et permissions du client

Ces écrans nécessitent un **client actif valide** et sont soumis au pipeline :

```text
JwtAuthGuard
→ ActiveClientGuard
→ ModuleAccessGuard
→ PermissionsGuard
```



### Conséquence frontend

On sépare visuellement et fonctionnellement :

* **routes plateforme** : `/admin/*`
* **routes métier client** : `/budgets`, `/projects`, `/contracts`, etc.

On n’introduit pas de faux préfixe `/workspace/*` dans l’URL.

---

## 11. Routing frontend

### Routes publiques

```text
/login
```

(La déconnexion est gérée par un bouton dans le header ; pas de route `/logout` dédiée.)

### Routes protégées (layout `(protected)`)

- **Indépendantes du client actif** : `/admin/*`, `/select-client`, `/no-client`
- **Nécessitant un client actif** : `/dashboard`, routes métier (`/budgets`, `/projects`, etc.)

```text
/admin
/admin/clients
/admin/users
/admin/audit
/select-client    — choix du client actif (plusieurs clients ACTIVE)
/no-client        — écran bloquant si aucun client ACTIVE (non platform admin)
/dashboard
/budgets
/budgets/[id]
/projects
...
/users
/roles
```

### Règle

Le mot **workspace** est un concept d’architecture visuelle, pas une convention de route.

---

## 12. Structure du repository frontend

La structure doit être **feature-first**, tout en conservant une couche shell et une couche partagée.

```text
apps/web/
└── src/
    ├── app/
    │   ├── (public)/
    │   │   ├── login/page.tsx
    │   │   └── logout/page.tsx
    │   ├── (protected)/
    │   │   ├── layout.tsx
    │   │   ├── dashboard/page.tsx
    │   │   ├── admin/
    │   │   │   ├── page.tsx
    │   │   │   ├── clients/page.tsx
    │   │   │   ├── users/page.tsx
    │   │   │   └── audit/page.tsx
    │   │   ├── budgets/
    │   │   │   ├── page.tsx
    │   │   │   └── [id]/page.tsx
    │   │   ├── projects/
    │   │   ├── suppliers/
    │   │   ├── contracts/
    │   │   ├── licenses/
    │   │   ├── users/
    │   │   └── roles/
    │   ├── layout.tsx
    │   └── globals.css
    │
    ├── components/
    │   ├── shell/
    │   │   ├── app-shell.tsx
    │   │   ├── sidebar.tsx
    │   │   ├── workspace-header.tsx
    │   │   ├── sidebar-section.tsx
    │   │   └── sidebar-item.tsx
    │   ├── ui/
    │   ├── shared/
    │   ├── data-display/
    │   └── feedback/
    │
    ├── features/
    │   ├── auth/
    │   │   ├── api/
    │   │   ├── hooks/
    │   │   ├── schemas/
    │   │   └── types/
    │   ├── active-client/
    │   │   ├── hooks/
    │   │   ├── store/
    │   │   ├── utils/
    │   │   └── types/
    │   ├── navigation/
    │   │   ├── config/
    │   │   ├── hooks/
    │   │   └── types/
    │   ├── admin-studio/
    │   │   ├── api/
    │   │   ├── components/
    │   │   ├── hooks/
    │   │   ├── mappers/
    │   │   ├── schemas/
    │   │   └── types/
    │   ├── budgets/
    │   ├── projects/
    │   ├── suppliers/
    │   ├── contracts/
    │   ├── licenses/
    │   ├── users/
    │   └── roles/
    │
    ├── lib/
    │   ├── api/
    │   │   ├── api-client.ts
    │   │   ├── auth-fetch.ts
    │   │   ├── client-headers.ts
    │   │   └── query-keys.ts
    │   ├── auth/
    │   ├── constants/
    │   ├── env.ts
    │   ├── errors.ts
    │   └── utils.ts
    │
    ├── providers/
    │   ├── app-provider.tsx
    │   ├── auth-provider.tsx
    │   ├── active-client-provider.tsx
    │   └── query-provider.tsx
    │
    ├── types/
    │   ├── api.ts
    │   ├── common.ts
    │   └── ui.ts
    │
    └── styles/
        └── tokens.css
```

### Règle d’organisation

* `app/` : routing, layouts, composition
* `components/` : composants transverses
* `features/` : logique par domaine
* `lib/api` : client HTTP central
* `providers/` : contexte global
* `styles/tokens.css` : design tokens

Cette structure reste compatible avec le bootstrap visé par le projet (`apps/web`, `packages/types`, etc.). 

---

## 13. Authentification frontend (RFC-014-2)

Les endpoints côté API : `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/me`, `GET /api/me/clients`. 

### Flux retenu

```text
POST /api/auth/login
→ stockage tokens
→ GET /api/me
→ GET /api/me/clients
→ sélection / restauration du client actif
→ chargement du cockpit
```

### Règles

* `GET /me` ne dépend pas du client actif
* `GET /me/clients` ne dépend pas du client actif
* les routes plateforme ne doivent pas exiger `X-Client-Id`
* les routes métier doivent exiger un client actif valide 

### Gestion du refresh token

Le frontend doit centraliser :

* l’ajout du bearer token
* le retry après `401` si refresh possible
* le logout propre si refresh impossible

Aucun composant ne gère lui-même le refresh. **Détail d'implémentation** : voir RFC-014-2 (AuthProvider, `resolve-active-client`, `authenticated-fetch`, logout toujours nettoyé, contrat X-Client-Id).

---

## 14. Client actif

Le mécanisme du client actif est central dans Starium Orchestra. La RFC dédiée précise qu’il doit être transmis via `X-Client-Id`, qu’il ne doit pas être stocké dans le JWT, et qu’il peut changer dynamiquement. 

### 14.1 Source de vérité frontend

Le frontend gère le client actif via :

* un `ActiveClientProvider`
* une persistance locale
* une injection automatique dans les requêtes métier

### 14.2 État exposé

```ts
type ActiveClientState = {
  activeClientId: string | null;
  activeClientName: string | null;
  availableClients: ClientSummary[];
  setActiveClient: (clientId: string) => void;
  clearActiveClient: () => void;
};
```

### 14.3 Persistance

Choix recommandé :

* **React Context** pour l’état courant
* **localStorage** pour la restauration entre sessions
* synchronisation au boot avec `GET /api/me/clients`

### 14.4 Règles critiques

* si le client actif n’existe plus dans `GET /me/clients`, il est supprimé localement
* si un utilisateur n’a qu’un seul client actif accessible, celui-ci peut être auto-sélectionné
* changement de client ⇒ invalidation du cache TanStack Query tenant-aware
* les pages plateforme ne lisent pas `activeClientId` pour fonctionner

**Implémentation RFC-014-2** : routes `/select-client` (choix du client) et `/no-client` (écran bloquant) ; résolution initiale via `lib/auth/resolve-active-client.ts` (une seule règle partagée).

---

## 15. API client central

Tous les appels HTTP passent par un **client unique**.

### Fichier central

```text
src/lib/api/api-client.ts
```

### Responsabilités

* ajouter `Authorization`
* ajouter `X-Client-Id` sur les routes métier
* ne pas l’ajouter sur les routes qui ne le nécessitent pas
* gérer `401`, `403`, `404`, `409`
* déclencher refresh token si nécessaire
* normaliser les erreurs techniques

### Règle

Aucun composant ou hook ne fait un `fetch` direct vers le backend sans passer par ce client.

**Implémentation RFC-014-2** : `lib/authenticated-fetch.ts` + hook `useAuthenticatedFetch` ; contrat strict (jamais X-Client-Id sur auth/me/platform/clients) ; 401 → un refresh puis retry, sinon clear session + `/login`.

---

## 16. Stratégie de données et cache

### Outil

* **TanStack Query**

### Règle critique multi-tenant

Toute `queryKey` de donnée métier doit intégrer le `clientId`.

### Exemples

```ts
["budgets", clientId, filters]
["projects", clientId, page, search]
["contracts", clientId, contractId]
```

### Interdiction

```ts
["budgets"]
["projects", page]
```

Ces clés créeraient des collisions de cache entre tenants.

### Invalidation

Lors d’un changement de client :

* invalidation ou reset du cache lié aux routes métier
* conservation éventuelle du cache plateforme si distinct

---

## 17. Navigation déclarative

La navigation ne doit pas être codée en dur à plusieurs endroits.

### Modèle recommandé

```ts
type NavigationItem = {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon;
  scope: "platform" | "client";
  moduleCode?: string;
  requiredPermissions?: string[];
  platformOnly?: boolean;   // visible si user.platformRole === 'PLATFORM_ADMIN'
  clientAdminOnly?: boolean; // visible si activeClient.role === 'CLIENT_ADMIN'
  children?: NavigationItem[];
};
```

### Avantages

* une seule source de vérité
* sidebar générée automatiquement
* filtrage simple par scope, modules et permissions
* extensibilité propre

### Filtrage d’affichage

La navigation affichée dépend de :

* `platformRole`
* client actif
* modules activés
* permissions utiles à l’affichage

Le backend reste l’autorité réelle d’accès. 

---

## 18. Gestion des permissions côté frontend

La doc sécurité est claire : le backend est la source de vérité, et les routes métier passent par `JwtAuthGuard`, `ActiveClientGuard`, `ModuleAccessGuard` puis `PermissionsGuard`. 

### Rôle du frontend

Le frontend peut :

* masquer une entrée de menu
* désactiver un bouton
* afficher un message d’accès refusé
* éviter d’exposer des actions manifestement interdites

### Il ne peut pas :

* “accorder” un droit
* considérer l’absence d’un bouton comme une sécurité
* contourner un `403`

### Hook recommandé

```text
features/navigation/hooks/use-navigation.ts
features/auth/hooks/use-authz.ts
```

Ces hooks lisent le contexte utilisateur et le contexte client pour aider l’affichage.

---

## 19. Pagination, filtres et listes

### Standard retenu

Pour rester cohérent avec tes APIs actuelles et les RFC déjà cadrées, on recommande **page + limit** sur les listes administratives et métier lorsque la volumétrie devient significative.

### Règles

* tous les tableaux doivent supporter loading / empty / error
* les filtres sont représentés dans l’URL quand c’est pertinent
* les listes paginées utilisent TanStack Query avec `queryKey` complète

### Exemples

```ts
["admin-clients", page, limit]
["audit-logs", page, limit, filters]
["budgets", clientId, page, limit, filters]
```

---

## 20. Forms et validation

### Outils

* `react-hook-form`
* `zod`

### Règles

* validation UX côté frontend pour améliorer l’expérience
* validation métier finale côté backend
* mapping explicite entre payload API et modèle de formulaire
* gestion claire des erreurs `400` / `409`

---

## 21. Design system et thème Starium

Le frontend s’appuie sur un **thème neutral** proche de l’exemple Dashboard shadcn, avec un accent or clair sur fond sombre (sidebar).

Palette de base :

* **Fond app** : gris clair (≈ Tailwind gray-100)
* **Cartes** : blanc
* **Sidebar** : slate très sombre
* **Texte principal** : slate-900
* **Texte sur fond sombre** : jaune très clair (or désaturé)
* **Accent / primaire** : or clair sur fond sombre, slate-900 sur fond clair

### Tokens CSS

Implémentation dans `apps/web/src/styles/tokens.css` :

```css
:root {
  /* Fond / surfaces */
  --color-bg-app: #f3f4f6;        /* gray-100 */
  --color-bg-card: #ffffff;
  --color-bg-sidebar: #020817;    /* slate-950 */

  /* Texte */
  --color-text-primary: #0f172a;  /* slate-900 */
  --color-text-inverse: #fefce8;  /* jaune très clair */
  --color-text-muted: #6b7280;    /* gray-500 */

  /* Bordures */
  --color-border-default: #e5e7eb; /* gray-200 */

  /* Couleurs principales */
  --color-primary: #facc15;             /* or clair (amber-400) */
  --color-primary-foreground: #f9fafb;  /* gray-50 */

  /* Tokens génériques */
  --radius: 0.75rem;
  --shadow-card: 0 18px 30px -15px rgba(15, 23, 42, 0.25);
  --color-hover: rgba(15, 23, 42, 0.06);
}
```

Ces tokens sont mappés sur les variables shadcn (`--background`, `--card`, `--sidebar`, etc.) dans `globals.css` et utilisés partout via les composants `components/ui/*`.

### Règle

Aucune couleur métier ne doit être codée en dur dans les composants hors design tokens. Toute nouvelle variation de palette (ex. secondaire, succès) doit passer par les tokens.

### Design system obligatoire (RFC-014-1)

Les pages doivent utiliser **uniquement** les composants des dossiers suivants :

* `components/ui/*` — composants shadcn (dont `KpiCard` pour les indicateurs dashboard)
* `components/layout/*` — PageContainer, PageHeader, TableToolbar
* `components/feedback/*` — LoadingState, EmptyState, ErrorState
* `components/data-table/*` — DataTable
* `components/shell/*` — AppShell, Sidebar, WorkspaceHeader

**HTML brut interdit** pour structurer l’interface. Toute nouvelle page doit suivre le pattern : PageContainer → PageHeader → TableToolbar → Card → DataTable (ou contenu métier) + gestion des états loading / empty / error.

---

## 22. Performance

### Règles principales

* privilégier Server Components quand utile pour la composition
* Client Components uniquement quand interaction nécessaire
* lazy loading des zones lourdes
* pagination côté API
* mémoïsation ciblée
* pas de sur-fetching

### Important

Le changement de client actif doit être traité comme un changement de contexte fort, avec invalidation propre des données métier.

---

## 23. Accessibilité et qualité

### Exigences minimales

* composants shadcn/ui respectés
* navigation clavier correcte
* contrastes compatibles avec la palette Starium
* libellés de formulaires explicites
* messages d’erreur compréhensibles
* états de chargement visibles

---

## 24. Admin Studio

L’Admin Studio est le cockpit de gestion plateforme. Il fait partie du core plateforme prévu par la vision produit. 

### Routes frontend

```text
/admin/clients
/admin/users
/admin/audit
```

### Capacités MVP

* créer un client
* voir les utilisateurs globaux
* consulter les audit logs

### Règles

* accessible uniquement aux `PLATFORM_ADMIN`
* ne dépend pas du client actif
* réutilise le même App Shell
* navigation dédiée dans la sidebar si `platformRole === PLATFORM_ADMIN`

---

## 25. Structure type d’une feature

Chaque feature suit une structure stable.

### Exemple : `features/budgets` (RFC-FE-001)

Structure réelle du module budget frontend (fondation) :

```text
features/budgets/
├── api/
│   ├── budget-management.api.ts
│   ├── budget-reporting.api.ts
│   ├── budget-dashboard.api.ts
│   └── stubs (snapshots, reallocations, imports, versioning)
├── hooks/
│   ├── use-budget-exercises.ts
│   ├── use-budgets.ts
│   ├── use-budget-summary.ts
│   └── use-budget-dashboard.ts
├── components/
│   ├── budget-page-header.tsx
│   ├── budget-kpi-cards.tsx
│   ├── budget-toolbar.tsx
│   ├── budget-list-table.tsx
│   ├── budget-status-badge.tsx
│   ├── budget-empty-state.tsx
│   ├── budget-error-state.tsx
│   └── forms/
├── schemas/
│   ├── create-budget.schema.ts
│   ├── create-envelope.schema.ts
│   ├── create-line.schema.ts
│   └── reallocate-budget.schema.ts
├── types/
│   ├── budget-management.types.ts
│   ├── budget-reporting.types.ts
│   ├── budget-dashboard.types.ts
│   └── placeholders (snapshots, reallocations, imports, versioning)
├── lib/
│   ├── budget-query-keys.ts   # Query keys tenant-aware (clientId obligatoire)
│   └── budget-formatters.ts
└── constants/
    └── budget-routes.ts
```

Détail : [docs/modules/budget-frontend.md](modules/budget-frontend.md).

### Règle

Chaque feature contient :

* son accès API (modules dédiés, pas de `fetch` direct dans les composants)
* ses hooks TanStack Query (query keys tenant-aware)
* ses composants métier
* ses schémas et types

On évite un gros dossier `services/` fourre-tout.

---

## 26. Providers globaux (RFC-014-2)

### Providers utilisés

* **AuthProvider** (session, user, tokens, login, logout, refreshSession)
* **ActiveClientProvider** (client actif, persistance localStorage)
* **QueryProvider** (TanStack Query ; présent dans le layout protégé)

### Ordre (root layout)

```tsx
<AuthProvider>
  <ActiveClientProvider>
    {children}
  </ActiveClientProvider>
</AuthProvider>
```

Le `QueryProvider` est monté dans le layout `(protected)` après le guard d'auth et le bootstrap client, autour de l'App Shell.

---

## 27. Contrats de données

### Règle

Les types frontend doivent être alignés sur les réponses API documentées. 

### Recommandation

À terme, partager les contrats communs dans :

```text
/packages/types
```

en cohérence avec le bootstrap monorepo prévu. 

---

## 28. Règles d’implémentation

### À faire

* pages minces
* logique métier frontend dans les features
* API centralisée
* design tokens
* query keys tenant-aware
* navigation déclarative
* séparation claire platform/client

### À éviter

* `fetch` direct dans les composants
* logique métier dupliquée
* couleurs codées en dur partout
* query keys sans `clientId`
* mélange des routes plateforme et client
* dépendances croisées entre features

---

## 29. Résumé d’architecture

Le frontend de Starium Orchestra repose sur :

* un **App Shell** stable
* une **sidebar persistante**
* un **header de workspace**
* une architecture **feature-first**
* un **client API central**
* un **contexte de client actif**
* une séparation stricte entre **scope plateforme** et **scope client**
* un cache **tenant-aware**
* un design system aligné sur l’identité Starium

---

## 30. Implémentation concrète actuelle (apps/web)

Cette section décrit rapidement **l’état réel** du frontend dans `apps/web` (2026‑03), pour que les futurs développements restent cohérents.

### 30.1 App Shell & routing

- `src/app/layout.tsx` : monte les providers principaux (`ThemeProvider`, `AuthProvider`, `ActiveClientProvider`) et importe `globals.css`.
- `src/app/(protected)/layout.tsx` : applique l’`AppShell` (sidebar + header + zone de contenu) aux pages protégées.
- `src/components/shell/` :
  - `sidebar.tsx` : navigation principale (colonne gauche compacte, icône + label en dessous, typographie réduite).
  - `workspace-header.tsx` : titre, client actif, recherche, toggle thème, actions utilisateur.
  - `app-shell.tsx` : composition globale si présent.

**Règle :** toute nouvelle page métier dans `(protected)` doit simplement rendre son contenu dans le `<main>` du shell, **sans recréer de layout**.

### 30.2 Design system & thèmes (Tailwind v4 + shadcn/ui)

- Fichier principal : `src/app/globals.css`.
- Design tokens Starium : `src/styles/tokens.css`.
- Thème basé sur les variables `oklch` shadcn (`--background`, `--foreground`, `--primary`, `--sidebar`, etc.) :
  - light et dark définis dans `:root` et `.dark`.
  - mapping vers Tailwind via `@theme inline` (`bg-background`, `bg-card`, `bg-sidebar`, `text-foreground`, etc.).
- Composants UI shadcn (base-nova) dans `src/components/ui/` :
  - `button.tsx`, `input.tsx`, `badge.tsx`, `card.tsx`, `table.tsx`, etc., générés puis adaptés.

Règles concrètes :

- Toujours utiliser les **couleurs de thème** (`bg-card`, `text-muted-foreground`, `border-border`, `bg-sidebar`, `text-sidebar-foreground`), **jamais** d’hex direct dans les composants.
- Pour le texte de contenu (tables, body de card), utiliser `text-card-foreground` / `text-muted-foreground` plutôt que `text-foreground`.
- Pour les bordures, utiliser `border`, `border-border`, ou les `ring-*` déjà branchés sur les variables.

### 30.3 Tables & listes (pattern DataTable)

- `src/components/ui/table.tsx` encapsule la table shadcn :

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nom</TableHead>
      <TableHead>Slug</TableHead>
      <TableHead>Créé le</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Client Demo</TableCell>
      <TableCell>client-demo-123</TableCell>
      <TableCell>10/03/2026</TableCell>
      <TableCell>…</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

- Header :
  - `TableHeader` ajoute un `bg-muted/60` et une bordure basse.
  - `TableHead` utilise `text-foreground` pour garder des en‑têtes lisibles.
- Lignes :
  - `TableRow` applique `border-b border-border/60` et un hover `bg-muted/50`.
  - `TableCell` reste sobre (`text-card-foreground` via la card).
- `src/components/data-table/data-table.tsx` fournit le pattern **DataTable** générique :
  - gère `loading / error / empty / success`.
  - prend une liste de colonnes typées (`DataTableColumn<T>`).
  - est utilisé dans les pages admin (`/admin/clients`, `/admin/users`, `/admin/audit`).

**Règle :** toute nouvelle table doit utiliser ce pattern (Card + DataTable + `ui/table`) pour rester cohérente visuellement et UX.

### 30.4 Sidebar et shell de contenu

- **Sidebar** : `src/components/shell/sidebar.tsx`. Largeur définie en CSS (`.starium-sidebar` dans `globals.css`) : **12rem**. Sections : `SidebarSection` + `SidebarItem`. Item Budgets : menu déroulant au survol (`SidebarDropdown` + contexte pour le panneau). Pour ajouter un lien : config dans `src/config/navigation.ts`.
- **App Shell** : `app-shell.tsx` utilise un wrapper de contenu unique `CONTENT_WRAPPER = 'mx-auto w-full max-w-7xl px-6 sm:px-8'` pour le header et le main, afin que le contenu soit aligné verticalement. Le header (`WorkspaceHeader`) reçoit `contentClassName` ; le main enveloppe les enfants dans ce même wrapper + `py-6 sm:py-8`.
- **PageContainer** : n’ajoute que l’espacement vertical (`space-y-6`) ; le padding horizontal et le `max-w-7xl` sont gérés par le shell.

### 30.5 Typographie

- Taille de base du body définie dans `globals.css` :

```css
body {
  font-size: 0.875rem; /* ~14px, cohérent avec un cockpit dense */
}
```

- Titre d’app dans la sidebar : `text-sm`.
- Titres de cards / sections : `text-base` ou `text-sm` selon le contexte.

**Règle :** pour du texte courant (lignes de tableau, labels de formulaire, descriptions), rester sur `text-sm` ou moins ; réserver `text-lg`+ aux titres vraiment structurants.

---

## 30. Vision finale

Le frontend doit être perçu comme :

> **le cockpit premium de pilotage des fonctions support**

Il doit permettre de piloter plusieurs organisations, de structurer la gouvernance IT, de rendre les données lisibles et actionnables, et d’offrir une expérience cohérente entre tous les modules, conformément à la vision long terme de Starium Orchestra. 
