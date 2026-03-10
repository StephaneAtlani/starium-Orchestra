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
KPI row
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
/logout
```

### Routes protégées plateforme

```text
/admin
/admin/clients
/admin/users
/admin/audit
```

### Routes protégées métier

```text
/dashboard
/budgets
/budgets/[id]
/projects
/projects/[id]
/suppliers
/contracts
/licenses
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

## 13. Authentification frontend

Les endpoints de base existent déjà côté API : login, refresh, logout, `GET /me`, `GET /me/clients`. 

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

Aucun composant ne gère lui-même le refresh.

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
  platformOnly?: boolean;
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

Le frontend doit suivre la palette Starium :

* **Or** `#DB9801`
* **Noir** `#1B1B1B`
* **Blanc** `#FFFFFF`

### Répartition recommandée

* sidebar : noir
* workspace : blanc cassé clair
* cartes : blanc
* accent principal : or
* bordures : ton clair neutre

### Tokens CSS

```css
:root {
  --color-bg-app: #f8f6f1;
  --color-bg-card: #ffffff;
  --color-bg-sidebar: #1b1b1b;
  --color-text-primary: #1b1b1b;
  --color-text-inverse: #ffffff;
  --color-text-muted: #6b7280;
  --color-border-default: #e8e1d1;
  --color-primary: #db9801;
  --color-primary-foreground: #ffffff;
  --radius: 0.75rem;
  --shadow-card: 0 18px 30px -15px rgba(0, 0, 0, 0.24);
  --color-hover: rgba(219, 152, 1, 0.08);
}
```

### Règle

Aucune couleur métier ne doit être codée en dur dans les composants hors design tokens.

### Design system obligatoire (RFC-014-1)

Les pages doivent utiliser **uniquement** les composants des dossiers suivants :

* `components/ui/*` — composants shadcn
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

### Exemple : `features/budgets`

```text
features/budgets/
├── api/
│   ├── get-budgets.ts
│   ├── get-budget.ts
│   └── create-budget.ts
├── components/
│   ├── budgets-table.tsx
│   ├── budget-filters.tsx
│   └── create-budget-dialog.tsx
├── hooks/
│   ├── use-budgets-query.ts
│   └── use-create-budget-mutation.ts
├── mappers/
│   └── budget.mapper.ts
├── schemas/
│   └── create-budget.schema.ts
└── types/
    └── budget.types.ts
```

### Règle

Chaque feature contient :

* son accès API
* ses hooks TanStack Query
* ses composants métier
* ses schémas et types

On évite un gros dossier `services/` fourre-tout.

---

## 26. Providers globaux

### Providers recommandés

* `QueryProvider`
* `AuthProvider`
* `ActiveClientProvider`
* `AppProvider`

### Ordre type

```tsx
<AppProvider>
  <AuthProvider>
    <ActiveClientProvider>
      <QueryProvider>{children}</QueryProvider>
    </ActiveClientProvider>
  </AuthProvider>
</AppProvider>
```

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

## 30. Vision finale

Le frontend doit être perçu comme :

> **le cockpit premium de pilotage des fonctions support**

Il doit permettre de piloter plusieurs organisations, de structurer la gouvernance IT, de rendre les données lisibles et actionnables, et d’offrir une expérience cohérente entre tous les modules, conformément à la vision long terme de Starium Orchestra. 
