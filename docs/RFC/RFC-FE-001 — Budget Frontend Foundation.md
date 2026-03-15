# RFC-FE-001 — Budget Frontend Foundation

## Statut

Draft

## Titre

**Budget Frontend Foundation — Fondations frontend du module Budget**

---

# 1. Objectif

Poser les **fondations frontend du module Budget** dans Starium Orchestra afin de permettre un développement cohérent, modulaire et évolutif des futures vues budgétaires.

Cette RFC introduit :

* la **structure feature-first** du domaine budget
* le **client API frontend** dédié aux routes budget
* les **hooks TanStack Query / React Query**
* le **layout et le shell applicatif** pour les écrans budget
* les **routes frontend** du module
* les **conventions de types, query keys, états UI et organisation des composants**

L’objectif n’est pas encore de livrer toutes les fonctionnalités métier du budget, mais de construire un **socle frontend robuste** permettant d’implémenter ensuite les écrans :

* exercices budgétaires
* budgets
* enveloppes
* lignes budgétaires
* reporting
* snapshots
* versions
* réallocations
* imports
* dashboard budget.

---

# 2. Problème résolu

Le backend budget progresse par RFC successives et expose déjà plusieurs APIs structurées :

* Budget Management
* Financial Core
* Budget Reporting
* Snapshots
* Reallocation
* Versioning
* Import
* futures dimensions analytiques et dashboard budget. 

En revanche, sans fondation frontend claire, le risque est de créer :

* des pages isolées sans cohérence d’architecture
* des appels API dispersés
* des query keys incohérentes
* une mauvaise gestion du contexte multi-client
* des composants difficiles à réutiliser
* une dette technique dès les premières pages budget.

Cette RFC résout ce problème en définissant un **cadre frontend standard** pour tout le domaine budget.

---

# 3. Périmètre

## Inclus

* structure `features/budgets`
* conventions de dossiers frontend budget
* client API centralisé pour les endpoints budget
* query keys budget tenant-aware
* hooks React Query pour lecture et mutations
* pages et routing budget de base
* layout applicatif des écrans budget
* composants partagés de base pour listes, toolbars, KPI, formulaires
* conventions d’erreurs, loading, empty states
* stratégie de typage frontend budget
* règles d’intégration avec auth et active client

## Exclus

* implémentation complète des écrans métier
* logique métier critique côté frontend
* duplication des calculs budgétaires côté UI
* génération de dashboard métier avancé
* moteur de formulaires générique transverse
* export Excel/PDF côté frontend
* design détaillé de chaque page budgétaire.

Cette RFC est une **fondation**, pas la totalité du module budget frontend.

---

# 4. Références et dépendances

Cette RFC dépend des éléments suivants :

* architecture projet Starium Orchestra
* architecture frontend globale
* RFC bootstrap projet
* RFC auth frontend / client actif
* RFC backend budget déjà livrées ou planifiées.

Dépendances backend directes :

* **RFC-015-2** — Budget Management Backend
* **RFC-015-1B** — Financial Core Backend
* **RFC-016** — Budget Reporting API
* **RFC-015-3** — Budget Snapshots
* **RFC-017** — Budget Reallocation
* **RFC-018** — Budget Data Import
* **RFC-019** — Budget Versioning
* **RFC-021** — Analytical Dimensions
* **RFC-022** — Budget Dashboard API. 

---

# 5. Principes d’architecture

## 5.1 API-first

Le frontend budget consomme uniquement les APIs backend.

Conséquences :

* aucun calcul budgétaire critique n’est autoritaire côté React
* aucune règle métier financière n’est dupliquée dans les composants
* le backend reste la source de vérité pour :

  * scope client
  * permissions
  * validations
  * montants consolidés
  * KPI
  * règles de cohérence budgétaire. 

## 5.2 Multi-client natif

Toutes les requêtes budget sont exécutées dans le contexte du **client actif** via `X-Client-Id`.

Conséquences :

* toutes les `queryKey` budget doivent intégrer `clientId`
* aucun cache budget ne doit être partagé entre deux clients
* un changement de client invalide le cache budget pertinent.

## 5.3 Feature-first

Le domaine budget est organisé en **feature frontend autonome**.

Objectifs :

* isoler la logique budget
* faciliter les évolutions par sous-domaines
* éviter un frontend structuré uniquement par type technique (`hooks/`, `services/`, `components/`) sans logique métier visible.

## 5.4 Cockpit de pilotage

Le budget n’est pas une simple suite de formulaires.

Le frontend budget doit permettre :

* lecture rapide des KPI
* navigation claire entre niveaux d’agrégation
* drill-down progressif :

  * exercice
  * budget
  * enveloppe
  * ligne
* actions contextualisées
* cohérence avec le cockpit global Starium Orchestra. 

---

# 6. Structure cible frontend

Le module budget frontend doit être organisé dans `apps/web/src/features/budgets/`.

## 6.1 Arborescence cible

```text
apps/web/src/
├── app/
│   └── (protected)/
│       └── budgets/
│           ├── page.tsx
│           ├── exercises/
│           │   ├── page.tsx
│           │   └── [id]/page.tsx
│           ├── [budgetId]/
│           │   ├── page.tsx
│           │   ├── lines/page.tsx
│           │   ├── reporting/page.tsx
│           │   ├── snapshots/page.tsx
│           │   ├── versions/page.tsx
│           │   └── reallocations/page.tsx
│           └── imports/page.tsx
│
├── features/
│   └── budgets/
│       ├── api/
│       │   ├── budget-management.api.ts
│       │   ├── budget-reporting.api.ts
│       │   ├── budget-snapshots.api.ts
│       │   ├── budget-reallocations.api.ts
│       │   ├── budget-imports.api.ts
│       │   ├── budget-versioning.api.ts
│       │   └── budget-dashboard.api.ts
│       ├── hooks/
│       │   ├── use-budget-exercises.ts
│       │   ├── use-budgets.ts
│       │   ├── use-budget-envelopes.ts
│       │   ├── use-budget-lines.ts
│       │   ├── use-budget-summary.ts
│       │   ├── use-budget-snapshots.ts
│       │   ├── use-budget-reallocations.ts
│       │   ├── use-budget-imports.ts
│       │   ├── use-budget-versioning.ts
│       │   └── use-budget-dashboard.ts
│       ├── components/
│       │   ├── budget-page-header.tsx
│       │   ├── budget-kpi-cards.tsx
│       │   ├── budget-toolbar.tsx
│       │   ├── budget-list-table.tsx
│       │   ├── budget-empty-state.tsx
│       │   ├── budget-error-state.tsx
│       │   ├── budget-status-badge.tsx
│       │   └── forms/
│       ├── schemas/
│       │   ├── create-budget.schema.ts
│       │   ├── create-envelope.schema.ts
│       │   ├── create-line.schema.ts
│       │   └── reallocate-budget.schema.ts
│       ├── types/
│       │   ├── budget-management.types.ts
│       │   ├── budget-reporting.types.ts
│       │   ├── budget-snapshots.types.ts
│       │   ├── budget-reallocations.types.ts
│       │   ├── budget-imports.types.ts
│       │   ├── budget-versioning.types.ts
│       │   └── budget-dashboard.types.ts
│       ├── lib/
│       │   ├── budget-query-keys.ts
│       │   ├── budget-filters.ts
│       │   ├── budget-formatters.ts
│       │   └── budget-mappers.ts
│       └── constants/
│           └── budget-routes.ts
```

## 6.2 Règle

Tout ce qui est spécifique au domaine budget doit vivre dans `features/budgets/`, sauf :

* les composants shell globaux
* le client HTTP global
* les providers applicatifs
* les primitives UI génériques.

---

# 7. Routing frontend

## 7.1 Routes de base

Les routes protégées budget vivent sous :

```text
/budgets
/budgets/exercises
/budgets/exercises/[id]
/budgets/[budgetId]
/budgets/[budgetId]/lines
/budgets/[budgetId]/reporting
/budgets/[budgetId]/snapshots
/budgets/[budgetId]/versions
/budgets/[budgetId]/reallocations
/budgets/imports
```

## 7.2 Règles de navigation

* `/budgets` = porte d’entrée cockpit budget
* `/budgets/exercises` = liste des exercices
* `/budgets/exercises/[id]` = vue synthèse d’un exercice
* `/budgets/[budgetId]` = vue synthèse d’un budget
* sous-routes = sous-domaines fonctionnels du budget

## 7.3 Navigation déclarative

Le menu budget doit être alimenté par une config déclarative compatible avec la navigation globale :

```ts
{
  key: "budgets",
  label: "Budgets",
  href: "/budgets",
  scope: "client",
  moduleCode: "budgets",
  requiredPermissions: ["budgets.read"]
}
```

Le backend reste l’autorité réelle ; l’affichage frontend n’est qu’une aide UX.

---

# 8. Layout et composition UI

## 8.1 App shell

Les pages budget utilisent le shell applicatif existant :

* sidebar globale
* header workspace
* zone de contenu métier.

## 8.2 Structure type d’une page budget

Chaque page budget suit la structure suivante :

```text
PageHeader
→ Row KPI (si pertinent)
→ Toolbar (filtres / recherche / actions)
→ Contenu principal (table / cards / détail)
→ Pagination / résumé
```

## 8.3 États obligatoires

Toute page de données budget doit gérer explicitement :

* loading
* error
* empty
* success

Aucune page budget ne doit afficher un écran vide sans état explicite.

---

# 9. Client API budget

## 9.1 Principe

Aucun composant budget ne fait de `fetch` direct.

Tous les appels passent par :

* le client HTTP central de l’application
* des modules API dédiés au domaine budget.

## 9.2 Organisation

Chaque sous-domaine a son fichier API :

* `budget-management.api.ts`
* `budget-reporting.api.ts`
* `budget-snapshots.api.ts`
* `budget-reallocations.api.ts`
* `budget-imports.api.ts`
* `budget-versioning.api.ts`
* `budget-dashboard.api.ts`

## 9.3 Responsabilités

Ces modules API :

* appellent les endpoints backend
* typent les réponses
* centralisent les paramètres de query
* laissent le client HTTP global gérer :

  * `Authorization`
  * `X-Client-Id`
  * refresh token
  * gestion des 401 / 403 / 409.

---

# 10. Query keys

## 10.1 Règle impérative

Toutes les query keys budget doivent intégrer `clientId`.

## 10.2 Exemples

```ts
["budgets", clientId, "exercises", filters]
["budgets", clientId, "exercise-summary", exerciseId]
["budgets", clientId, "budget-list", filters]
["budgets", clientId, "budget-detail", budgetId]
["budgets", clientId, "budget-envelopes", budgetId, filters]
["budgets", clientId, "budget-lines", envelopeId, filters]
["budgets", clientId, "budget-summary", budgetId]
["budgets", clientId, "snapshots", budgetId, filters]
["budgets", clientId, "versions", budgetId]
["budgets", clientId, "reallocations", budgetId, filters]
["budgets", clientId, "imports", budgetId, filters]
["budgets", clientId, "dashboard", filters]
```

## 10.3 Interdiction

Sont interdits :

```ts
["budgets"]
["budget-detail", budgetId]
["budget-lines", filters]
```

car ils créent des collisions de cache inter-clients.

---

# 11. Hooks React Query

## 11.1 Objectif

Chaque ressource majeure expose ses hooks dédiés.

Exemples :

* `useBudgetExercisesList`
* `useBudgetExerciseSummary`
* `useBudgetsList`
* `useBudgetDetail`
* `useBudgetEnvelopesList`
* `useBudgetLinesList`
* `useBudgetSummary`
* `useCreateBudgetMutation`
* `useUpdateBudgetLineMutation`
* `useCreateSnapshotMutation`
* `useCreateReallocationMutation`

## 11.2 Règles

Les hooks doivent :

* encapsuler TanStack Query
* utiliser les query keys standard
* invalider précisément le cache concerné
* ne jamais contenir de logique métier critique
* exposer une API simple aux composants pages.

## 11.3 Mutations

Les mutations doivent invalider au minimum :

* la ressource ciblée
* les listes impactées
* les synthèses impactées
* éventuellement le dashboard budget si le périmètre le nécessite.

Exemple :

création d’une réallocation :

* invalider `budget-detail`
* invalider `budget-lines`
* invalider `budget-summary`
* invalider `reallocations`
* invalider `dashboard` si concerné.

---

# 12. Typage frontend

## 12.1 Principe

Le frontend doit définir des types alignés sur les contrats API, sans recoder les règles métier.

## 12.2 Découpage

Les types sont séparés par sous-domaine :

* management
* reporting
* snapshots
* reallocations
* imports
* versioning
* dashboard

## 12.3 Mapping

Quand nécessaire, le frontend peut définir :

* types API bruts
* types UI mappés

Exemple :

```ts
type BudgetSummaryApi = {
  totalInitialAmount: number;
  totalRevisedAmount: number;
  totalForecastAmount: number;
  totalCommittedAmount: number;
  totalConsumedAmount: number;
  totalRemainingAmount: number;
};

type BudgetSummaryCardModel = {
  label: string;
  value: string;
  trend?: "positive" | "negative" | "neutral";
};
```

Le mapping UI ne doit jamais changer la vérité métier.

---

# 13. Formulaires et validation

## 13.1 Outils

Les formulaires budget utilisent :

* React Hook Form
* Zod.

## 13.2 Règles

Le frontend valide uniquement :

* format
* champs requis
* cohérence minimale d’UX

Le backend reste autoritaire pour :

* cohérence hiérarchique
* scope client
* permissions
* règles budgétaires métier
* validations financières.

---

# 14. Composants partagés budget

## 14.1 Composants attendus

Le socle budget doit au minimum prévoir :

* `BudgetPageHeader`
* `BudgetKpiCards`
* `BudgetToolbar`
* `BudgetListTable`
* `BudgetStatusBadge`
* `BudgetEmptyState`
* `BudgetErrorState`

## 14.2 Objectif

Éviter que chaque écran budget reconstruise :

* ses badges de statut
* ses cartes KPI
* ses toolbars
* ses états vides
* ses messages d’erreur.

---

# 15. Gestion des permissions et accès

## 15.1 Accès module

Le frontend budget n’affiche les routes et actions que si l’utilisateur a un contexte compatible.

Conditions minimales :

* utilisateur authentifié
* client actif valide
* module `budgets` activé
* permissions adaptées à l’action.

## 15.2 Règle de sécurité

Masquer un bouton ne constitue jamais une sécurité.

Le backend garde l’autorité via :

* `JwtAuthGuard`
* `ActiveClientGuard`
* `ModuleAccessGuard`
* `PermissionsGuard`.

---

# 16. Conventions UX du module budget

## 16.1 Vue cockpit

La route `/budgets` doit servir de cockpit d’entrée et non de simple table brute.

Elle doit à terme pouvoir présenter :

* KPI globaux
* liste des budgets récents
* alertes ou anomalies
* accès rapide aux actions fréquentes.

## 16.2 Drill-down

Le parcours cible doit être lisible :

```text
Budgets
→ Exercice
→ Budget
→ Enveloppe
→ Ligne
```

## 16.3 Actions contextualisées

Les actions ne doivent pas être disséminées sans contexte.

Exemples :

* créer une enveloppe depuis un budget
* créer une ligne depuis une enveloppe
* lancer une réallocation depuis une ligne ou un budget
* créer un snapshot depuis la vue budget
* ouvrir le reporting depuis le budget courant.

---

# 17. Non-objectifs techniques

Cette RFC ne doit pas dériver vers :

* un store global métier spécifique budget
* de la logique métier dans les composants
* un moteur de table générique complexe prématuré
* un design system budgétaire parallèle au design system global
* des appels API depuis les pages sans couche feature.

---

# 18. Critères de succès

La RFC est considérée comme réussie si :

1. le module budget frontend dispose d’une **structure feature-first claire**
2. les routes budget de base existent
3. le client API budget est centralisé
4. les hooks React Query budget sont en place
5. les query keys sont **tenant-aware**
6. les pages budget s’intègrent correctement dans l’App Shell
7. les états `loading / error / empty / success` sont standardisés
8. les composants de base budget sont réutilisables
9. aucune logique métier critique n’est portée par le frontend
10. la fondation permet de développer proprement les RFC frontend suivantes.

---

# 19. Découpage recommandé après cette RFC

Cette fondation prépare les RFC frontend suivantes, par exemple :

* **RFC-FE-002** — Budget Cockpit & Index Page
* **RFC-FE-003** — Budget Exercises & Budgets Listing
* **RFC-FE-004** — Budget Detail, Envelopes & Lines
* **RFC-FE-005** — Budget Reporting Views
* **RFC-FE-006** — Budget Snapshots UI
* **RFC-FE-007** — Budget Reallocation UI
* **RFC-FE-008** — Budget Import UI
* **RFC-FE-009** — Budget Versioning UI
* **RFC-FE-010** — Budget Dashboard UI
* **RFC-FE-011** — Analytical Dimensions UI

---

# 20. Décision d’architecture

Décision retenue :

> Le module budget frontend de Starium Orchestra sera développé selon une architecture **feature-first**, adossée à un **client API central**, des **hooks TanStack Query tenant-aware**, une **navigation intégrée au cockpit global**, et un **layout cohérent avec l’App Shell**, sans duplication de logique métier critique côté frontend.
