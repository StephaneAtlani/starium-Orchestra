# RFC-FE-003 — Budget Exercises & Budgets List UI

## Statut

Draft

## Titre

**Budget Exercises & Budgets List UI — pages de listing avec filtres, recherche et pagination**

## Objectif

Implémenter les **deux pages de listing socle** du module Budget côté frontend :

* **liste des exercices budgétaires**
* **liste des budgets**

avec :

* chargement depuis l’API backend existante
* filtres métier
* recherche texte
* pagination
* synchronisation des filtres dans l’URL
* états `loading / error / empty / success`
* intégration dans l’App Shell et l’architecture feature-first existante.  

Cette RFC pose la base UI du pilotage budgétaire, en cohérence avec la vision cockpit de Starium Orchestra et avec le backend déjà en place pour `budget-exercises` et `budgets`.  

---

# 1. Contexte

## 1.1 Backend disponible

Le backend expose déjà les endpoints de structure budgétaire suivants :

* `GET /api/budget-exercises`
* `GET /api/budgets`

avec filtres, recherche et pagination standard `limit / offset`, dans un format de liste uniforme :

```ts
{
  items: T[],
  total: number,
  limit: number,
  offset: number
}
```

Les routes sont protégées par :

* `JwtAuthGuard`
* `ActiveClientGuard`
* `ModuleAccessGuard`
* `PermissionsGuard`

avec la permission `budgets.read` pour les GET, et toutes les requêtes métier nécessitent `Authorization` + `X-Client-Id`.  

## 1.2 Endpoints et filtres backend utiles

### Exercices

`GET /api/budget-exercises`

Query supportées :

* `status`
* `search`
* `offset`
* `limit`

Tri par défaut : `startDate desc`.  

### Budgets

`GET /api/budgets`

Query supportées :

* `exerciseId`
* `status`
* `ownerUserId`
* `search`
* `offset`
* `limit`

Tri par défaut : `createdAt desc`.  

## 1.3 Contraintes frontend projet

Le frontend doit respecter :

* architecture **feature-first**
* **App Shell** stable
* **API centralisée**
* **TanStack Query**
* **query keys tenant-aware**
* pages minces
* composants du design system existant
* aucune logique métier critique côté UI.   

---

# 2. Périmètre

## Inclus

* page `/budgets/exercises`
* page `/budgets`
* table de listing des exercices
* table de listing des budgets
* toolbar de recherche / filtres / reset
* pagination
* URL search params synchronisés
* hooks TanStack Query
* types frontend alignés API
* navigation vers la page budgets depuis un exercice
* navigation vers la future page détail budget

## Exclus

* création / édition
* vue détail exercice
* vue détail budget complète
* KPI dashboard
* reporting consolidé RFC-016
* snapshots, versioning, import, reallocation
* écrans analytiques RFC-021 / cockpit RFC-022. 

---

# 3. UX cible

## 3.1 Page liste des exercices

Route :

```text
/(protected)/budgets/exercises
```

Contenu :

* `PageHeader`

  * titre : **Exercices budgétaires**
  * description courte
* `TableToolbar`

  * recherche par nom/code
  * filtre `status`
  * sélecteur `limit`
  * bouton reset
* tableau paginé

Colonnes recommandées :

* `Nom`
* `Code`
* `Période`
* `Statut`
* `Nombre de budgets` *(si non disponible API : retirer pour cette RFC)*
* `Actions`

Actions ligne :

* `Voir les budgets` → redirection vers `/budgets?exerciseId=<id>`
* `Ouvrir` → future compatibilité détail

## 3.2 Page liste des budgets

Route :

```text
/(protected)/budgets
```

Contenu :

* `PageHeader`

  * titre : **Budgets**
  * description courte
* `TableToolbar`

  * recherche
  * filtre `exerciseId`
  * filtre `status`
  * éventuellement filtre `ownerUserId` seulement si les données source sont déjà disponibles proprement
  * sélecteur `limit`
  * bouton reset
* tableau paginé

Colonnes recommandées :

* `Nom`
* `Code`
* `Exercice`
* `Devise`
* `Statut`
* `Responsable`
* `Créé le`
* `Actions`

Actions ligne :

* `Ouvrir` → `/budgets/[id]` (même si la page détail est encore squelette)
* `Voir dashboard` → futur branchement RFC-FE cockpit

---

# 4. Structure cible

Créer ou compléter dans :

```text
apps/web/src/features/budgets/
├── api/
│   ├── get-budget-exercises.ts
│   ├── get-budgets.ts
│   └── get-budget-exercise-options.ts
├── hooks/
│   ├── use-budget-exercises-query.ts
│   ├── use-budgets-query.ts
│   └── use-budget-list-filters.ts
├── components/
│   ├── budget-exercises-table.tsx
│   ├── budgets-table.tsx
│   ├── budget-exercises-toolbar.tsx
│   ├── budgets-toolbar.tsx
│   ├── budget-status-badge.tsx
│   └── pagination-summary.tsx
├── types/
│   └── budget-list.types.ts
├── mappers/
│   └── budget-list.mapper.ts
└── constants/
    └── budget-filters.ts
```

Créer les pages :

```text
apps/web/src/app/(protected)/budgets/page.tsx
apps/web/src/app/(protected)/budgets/exercises/page.tsx
```

Cette organisation est cohérente avec la structure feature-first recommandée et l’exemple `features/budgets` déjà posé dans l’architecture frontend.  

---

# 5. Contrats TypeScript

## 5.1 Types communs

```ts
export type ListResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};
```

## 5.2 BudgetExerciseSummary

```ts
export type BudgetExerciseStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "ARCHIVED";

export type BudgetExerciseSummary = {
  id: string;
  name: string;
  code: string | null;
  startDate: string;
  endDate: string;
  status: BudgetExerciseStatus;
  createdAt?: string;
  updatedAt?: string;
};
```

## 5.3 BudgetSummary

```ts
export type BudgetStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "REVISED"
  | "VALIDATED"
  | "LOCKED"
  | "ARCHIVED";

export type BudgetSummary = {
  id: string;
  exerciseId: string;
  name: string;
  code: string | null;
  description?: string | null;
  currency: string;
  status: BudgetStatus;
  ownerUserId?: string | null;
  ownerUserName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  exerciseName?: string;
  exerciseCode?: string | null;
};
```

## 5.4 Query params frontend

```ts
export type BudgetExercisesListParams = {
  search?: string;
  status?: BudgetExerciseStatus | "ALL";
  page?: number;
  limit?: number;
};

export type BudgetsListParams = {
  search?: string;
  exerciseId?: string;
  status?: BudgetStatus | "ALL";
  ownerUserId?: string;
  page?: number;
  limit?: number;
};
```

---

# 6. API frontend

Tous les appels doivent passer par le client HTTP central / `useAuthenticatedFetch`, avec injection automatique du `Authorization` et du `X-Client-Id` sur les routes métier. 

## 6.1 getBudgetExercises

```ts
GET /api/budget-exercises?status=&search=&offset=&limit=
```

Mapper :

* `page` → `offset = (page - 1) * limit`
* si `status === "ALL"` : ne pas envoyer le paramètre

## 6.2 getBudgets

```ts
GET /api/budgets?exerciseId=&status=&ownerUserId=&search=&offset=&limit=
```

Règles identiques.

## 6.3 getBudgetExerciseOptions

Pour alimenter le filtre `exerciseId` de la page budgets :

* appel léger à `GET /api/budget-exercises`
* `limit=100`
* éventuellement `status=ACTIVE` seulement si on veut réduire la liste
* sinon charger tous les exercices utiles à l’écran.

---

# 7. Hooks TanStack Query

Les query keys doivent inclure le `clientId`. C’est obligatoire pour éviter toute collision inter-tenant. 

## 7.1 Query keys

```ts
["budget-exercises", clientId, filters]
["budgets", clientId, filters]
["budget-exercise-options", clientId]
```

## 7.2 Hooks

```ts
useBudgetExercisesQuery(filters)
useBudgetsQuery(filters)
useBudgetExerciseOptionsQuery()
```

Options recommandées :

* `placeholderData: keepPreviousData`
* `staleTime` modéré
* reset automatique lors du changement de client via invalidation globale existante. 

---

# 8. Synchronisation URL

Les filtres doivent être reflétés dans les search params pour permettre :

* refresh sans perte d’état
* partage d’URL
* navigation browser back/forward cohérente

## 8.1 Exercices

Exemple :

```text
/budgets/exercises?search=2026&status=ACTIVE&page=2&limit=20
```

## 8.2 Budgets

Exemple :

```text
/budgets?exerciseId=clx123&status=VALIDATED&search=it&page=1&limit=20
```

## 8.3 Règles

* `page` par défaut = 1
* `limit` par défaut = 20
* ne pas garder les params vides
* au changement d’un filtre ou d’une recherche, reset `page=1`

---

# 9. Composants UI

## 9.1 budget-status-badge

Afficher les statuts avec variantes simples :

* `DRAFT`
* `ACTIVE`
* `CLOSED`
* `LOCKED`
* `ARCHIVED`

Utiliser un composant badge existant shadcn/ui, sans logique métier lourde.

## 9.2 toolbars

Deux toolbars séparées :

* `BudgetExercisesToolbar`
* `BudgetsToolbar`

Responsabilités :

* lecture des filtres courants
* émission des changements
* champ recherche avec debounce léger
* reset complet

## 9.3 tables

Deux composants dédiés :

* `BudgetExercisesTable`
* `BudgetsTable`

Utiliser le design system projet :

* `PageContainer`
* `PageHeader`
* `TableToolbar`
* `Card`
* `DataTable`
* `LoadingState`
* `ErrorState`
* `EmptyState` 

---

# 10. États UI obligatoires

## Loading

Afficher `LoadingState` pleine zone.

## Error

Afficher `ErrorState` avec bouton retry.

## Empty

Cas exercices :

* “Aucun exercice budgétaire trouvé.”

Cas budgets :

* “Aucun budget trouvé.”

## Success

Afficher tableau + résumé pagination :

```text
1–20 sur 84 résultats
```

Ces états sont explicitement obligatoires dans l’architecture frontend. 

---

# 11. Règles métier frontend

## 11.1 Pas de logique critique

Le frontend :

* n’interprète pas les permissions comme une sécurité
* n’invente aucun calcul métier
* se contente d’afficher les données backend. 

## 11.2 Owner filter

Le filtre `ownerUserId` sur `/api/budgets` existe côté backend, mais il ne doit être affiché que si le frontend dispose déjà d’une source propre pour la liste des utilisateurs. Sinon :

* le supporter dans les types/API
* ne pas l’exposer dans l’UI de cette RFC

Décision recommandée pour cette RFC :

* **support API oui**
* **UI filtre ownerUserId non**, pour rester resserré.

## 11.3 Exercise selector

La page budgets doit pouvoir être préfiltrée depuis la page exercices :

```text
/budgets?exerciseId=<id>
```

---

# 12. Navigation

Ajouter ou vérifier les entrées suivantes dans la navigation :

* `Budgets` → `/budgets`
* sous-entrée ou accès secondaire : `/budgets/exercises`

Recommandation UX :

* entrée sidebar principale : `/budgets`
* onglets secondaires sur les pages budgets :

  * `Budgets`
  * `Exercices`

Cela reste cohérent avec la navigation déclarative et la stabilité de l’App Shell. 

---

# 13. Implémentation pages

## 13.1 `/budgets/exercises/page.tsx`

Page mince :

* lit les `searchParams`
* normalise les filtres
* appelle `useBudgetExercisesQuery`
* rend header + toolbar + états + table

## 13.2 `/budgets/page.tsx`

Même principe, avec chargement supplémentaire des options exercices.

---

# 14. Critères d’acceptation

## Exercices

* la page charge la liste depuis `/api/budget-exercises`
* la recherche fonctionne
* le filtre `status` fonctionne
* la pagination fonctionne
* les filtres sont reflétés dans l’URL
* le clic “Voir les budgets” ouvre `/budgets?exerciseId=<id>`

## Budgets

* la page charge la liste depuis `/api/budgets`
* la recherche fonctionne
* le filtre `exerciseId` fonctionne
* le filtre `status` fonctionne
* la pagination fonctionne
* l’URL reflète l’état courant
* le clic ligne ou action ouvre `/budgets/[id]`

## Technique

* query keys tenant-aware
* aucun `fetch` direct dans les composants
* pages minces
* types alignés API
* états loading/error/empty explicites
* aucun hardcode de logique métier.  

---

# 15. Ordre d’implémentation recommandé

1. Créer les `types` de listes budgets / exercices.
2. Implémenter `get-budget-exercises.ts`.
3. Implémenter `get-budgets.ts`.
4. Implémenter `useBudgetExercisesQuery`.
5. Implémenter `useBudgetsQuery`.
6. Implémenter `budget-status-badge.tsx`.
7. Implémenter `budget-exercises-toolbar.tsx`.
8. Implémenter `budgets-toolbar.tsx`.
9. Implémenter `budget-exercises-table.tsx`.
10. Implémenter `budgets-table.tsx`.
11. Créer `/budgets/exercises/page.tsx`.
12. Créer `/budgets/page.tsx`.
13. Raccorder la navigation.
14. Vérifier l’invalidation au changement de client.
15. Faire les tests manuels + lint + build.

---

# 16. Tests attendus

## Manuels

* recherche par texte
* changement de statut
* reset filtres
* navigation pagination
* conservation via refresh navigateur
* changement de client actif
* 401/403 correctement gérés par le client HTTP
* état empty sur client sans données

## Techniques

* `pnpm lint`
* `pnpm build`

Optionnel :

* tests composants des toolbars
* tests mapping search params ↔ query params

