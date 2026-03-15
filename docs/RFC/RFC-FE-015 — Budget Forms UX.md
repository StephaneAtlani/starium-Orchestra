# RFC-FE-015 — Budget Forms UX

## Statut

**Implémenté** (mars 2025)

## Titre

**Budget Forms UX — Formulaires create/edit pour exercices, budgets, enveloppes et lignes**

---

# 1. Objectif

Introduire l’UX complète de création et de modification pour les entités structurelles du module Budget :

* **BudgetExercise**
* **Budget**
* **BudgetEnvelope**
* **BudgetLine**

Cette RFC couvre les écrans, formulaires, validations frontend, états UX et comportements de navigation nécessaires pour permettre une saisie fluide, cohérente et robuste dans le cockpit Starium Orchestra.

Le but est de permettre à un utilisateur autorisé de :

* créer un exercice budgétaire
* créer un budget rattaché à un exercice
* créer une enveloppe rattachée à un budget
* créer une ligne budgétaire rattachée à un budget et à une enveloppe
* modifier ces objets depuis l’interface
* bénéficier d’une UX claire sur :

  * validation
  * chargement
  * erreur
  * succès
  * redirection post-action

Cette RFC ne modifie pas le backend. Elle consomme uniquement les APIs existantes du module `budget-management`.

---

# 2. Problème résolu

Le backend budget-management expose déjà le CRUD de la structure budgétaire via les routes :

* `POST /api/budget-exercises`
* `PATCH /api/budget-exercises/:id`
* `POST /api/budgets`
* `PATCH /api/budgets/:id`
* `POST /api/budget-envelopes`
* `PATCH /api/budget-envelopes/:id`
* `POST /api/budget-lines`
* `PATCH /api/budget-lines/:id`

Cependant, sans UX dédiée :

* la création reste impossible depuis le frontend
* les utilisateurs ne peuvent pas structurer un budget depuis l’interface
* l’adoption du module budget est bloquée
* le cockpit reste en lecture seule

Cette RFC ajoute la couche UX d’écriture manquante, conformément au principe “Frontend → API → Backend → Database”, sans embarquer de logique métier critique côté UI.

---

# 3. Périmètre

## Inclus

* formulaires create/edit pour :

  * exercices
  * budgets
  * enveloppes
  * lignes
* validation de formulaire côté frontend
* mutations TanStack Query
* états UX :

  * idle
  * loading
  * success
  * error
* gestion des erreurs API
* redirection après création
* préremplissage en mode édition
* gestion des valeurs par défaut
* UX cohérente desktop/mobile
* intégration au domaine `features/budgets`

## Exclus

* suppression
* duplication
* import Excel
* snapshots
* versioning
* réallocation
* workflow d’approbation
* formulaires des dimensions analytiques RFC-021
* wizard multi-étapes complexe
* autosave

---

# 4. Références projet

Cette RFC s’appuie sur les principes suivants :

* frontend feature-first
* App Router Next.js
* TypeScript
* Tailwind
* shadcn/ui
* TanStack Query
* React Hook Form
* Zod
* backend source de vérité
* multi-client via `X-Client-Id`
* aucune logique métier critique côté frontend.

Les entités et règles structurelles du budget sont définies par le backend budget-management.

---

# 5. Principes UX

## 5.1 Cockpit avant tout

Les formulaires doivent s’intégrer à une logique de cockpit :

* action claire
* contexte visible
* peu de friction
* retour explicite après action

L’utilisateur doit toujours savoir :

* ce qu’il crée ou modifie
* dans quel budget / exercice / enveloppe il agit
* ce qui se passe pendant l’enregistrement
* où il sera redirigé après succès

## 5.2 Même convention pour toutes les entités

Tous les formulaires suivent le même contrat UX :

* titre de page
* sous-titre contextualisé
* formulaire principal
* actions en bas :

  * Annuler
  * Enregistrer
* messages d’erreur lisibles
* désactivation pendant submit
* toast de succès ou bannière de confirmation
* redirection cohérente

## 5.3 Backend source de vérité

Le frontend valide la forme des données, mais pas les règles métier critiques.

Exemples :

* format requis
* champ obligatoire
* nombre valide
* date valide

Mais le backend reste seul juge pour :

* appartenance client
* cohérence hiérarchique
* permissions
* règles de calcul financier
* cohérence budget/enveloppe/ligne.

---

# 6. Routes frontend

Les routes protégées concernées sont :

```text
/budgets/exercises/new
/budgets/exercises/[exerciseId]/edit

/budgets/new
/budgets/[budgetId]/edit

/budgets/[budgetId]/envelopes/new
/budget-envelopes/[envelopeId]/edit

/budgets/[budgetId]/lines/new
/budget-lines/[lineId]/edit
```

## Décision

Pour rester cohérent avec l’existant, les créations contextuelles d’enveloppes et de lignes partent du budget courant :

* création d’enveloppe : route contextualisée par `budgetId`
* création de ligne : route contextualisée par `budgetId`

L’édition peut rester accessible via l’ID de l’objet, avec récupération de son contexte parent après chargement.

---

# 7. Structure frontend cible

Dans `features/budgets/`, créer une sous-structure dédiée aux formulaires :

```text
features/budgets/
├── api/
│   ├── budget-management.api.ts
│   └── budget-form-mutations.ts
├── components/
│   ├── forms/
│   │   ├── budget-exercise-form.tsx
│   │   ├── budget-form.tsx
│   │   ├── budget-envelope-form.tsx
│   │   ├── budget-line-form.tsx
│   │   ├── budget-form-actions.tsx
│   │   └── fields/
│   ├── pages/
│   │   ├── budget-exercise-form-page.tsx
│   │   ├── budget-form-page.tsx
│   │   ├── budget-envelope-form-page.tsx
│   │   └── budget-line-form-page.tsx
│   └── shared/
├── hooks/
│   ├── use-create-budget-exercise.ts
│   ├── use-update-budget-exercise.ts
│   ├── use-create-budget.ts
│   ├── use-update-budget.ts
│   ├── use-create-budget-envelope.ts
│   ├── use-update-budget-envelope.ts
│   ├── use-create-budget-line.ts
│   ├── use-update-budget-line.ts
│   └── use-budget-form-options.ts
├── schemas/
│   ├── budget-exercise-form.schema.ts
│   ├── budget-form.schema.ts
│   ├── budget-envelope-form.schema.ts
│   └── budget-line-form.schema.ts
├── mappers/
│   └── budget-form.mappers.ts
└── types/
```

Cette approche reste conforme à l’architecture feature-first recommandée pour Starium Orchestra.

---

# 8. APIs consommées

## Exercices

* `GET /api/budget-exercises/:id`
* `POST /api/budget-exercises`
* `PATCH /api/budget-exercises/:id`

## Budgets

* `GET /api/budgets/:id`
* `GET /api/budget-exercises?limit=&offset=...` pour les options d’exercice
* `POST /api/budgets`
* `PATCH /api/budgets/:id`

## Enveloppes

* `GET /api/budget-envelopes/:id`
* `GET /api/budget-envelopes?budgetId=...` pour choix éventuel du parent
* `POST /api/budget-envelopes`
* `PATCH /api/budget-envelopes/:id`

## Lignes

* `GET /api/budget-lines/:id`
* `GET /api/budget-envelopes?budgetId=...` pour les options d’enveloppe
* `POST /api/budget-lines`
* `PATCH /api/budget-lines/:id`

Toutes les requêtes métier utilisent le client API authentifié existant et envoient `X-Client-Id` sur les routes métier.

---

# 9. Champs par formulaire

## 9.1 Formulaire Exercice

### Champs

* `name` — obligatoire
* `code` — optionnel
* `startDate` — obligatoire
* `endDate` — obligatoire
* `status` — optionnel

### Règles UX

* `startDate` et `endDate` via date picker ou input date natif
* message explicite si `endDate < startDate`
* en création : `status` prérempli à `DRAFT`

---

## 9.2 Formulaire Budget

### Champs

* `exerciseId` — obligatoire
* `name` — obligatoire
* `code` — optionnel
* `description` — optionnel
* `currency` — obligatoire
* `status` — optionnel
* `ownerUserId` — optionnel

### Règles UX

* `exerciseId` via select alimenté depuis les exercices
* `currency` par défaut à `EUR`
* `status` prérempli à `DRAFT`
* `ownerUserId` affiché seulement si une source d’options existe côté frontend ; sinon masqué dans cette RFC

---

## 9.3 Formulaire Enveloppe

### Champs

* `budgetId` — obligatoire
* `parentId` — optionnel si supporté côté API/projet
* `name` — obligatoire
* `code` — optionnel
* `description` — optionnel
* `type` — obligatoire
* `status` — optionnel

### Règles UX

* `budgetId` fixé par le contexte de page en création
* `type` via select :

  * `RUN`
  * `BUILD`
  * `TRANSVERSE`
* `status` prérempli à `DRAFT`
* `parentId` proposé uniquement si la hiérarchie d’enveloppe est déjà exploitable dans le frontend

---

## 9.4 Formulaire Ligne budgétaire

### Champs

* `budgetId` — obligatoire
* `envelopeId` — obligatoire
* `name` — obligatoire
* `code` — optionnel
* `description` — optionnel
* `expenseType` — obligatoire
* `initialAmount` — obligatoire
* `revisedAmount` — optionnel
* `currency` — obligatoire
* `status` — optionnel

### Règles UX

* `budgetId` fixé par le contexte
* `envelopeId` via select filtré sur le budget courant
* `expenseType` via select
* `initialAmount` et `revisedAmount` via champ numérique décimal
* `currency` par défaut `EUR`
* si `revisedAmount` est vide à la création, ne pas forcer côté frontend : laisser le backend appliquer sa règle de fallback (`revisedAmount = initialAmount si absent`).

---

# 10. Validation frontend

Les formulaires utilisent :

* **React Hook Form**
* **Zod**

Objectif : éviter les requêtes triviales invalides et améliorer le confort utilisateur.

## Règles minimales

### Exercice

* `name` non vide
* `startDate` valide
* `endDate` valide
* `endDate >= startDate`

### Budget

* `exerciseId` requis
* `name` non vide
* `currency` non vide

### Enveloppe

* `budgetId` requis
* `name` non vide
* `type` requis

### Ligne

* `budgetId` requis
* `envelopeId` requis
* `name` non vide
* `expenseType` requis
* `initialAmount` numérique et >= 0
* `revisedAmount` si renseigné : numérique et >= 0
* `currency` non vide

## Règle

Aucune validation frontend ne doit réimplémenter des règles métier backend complexes.

---

# 11. Comportement create / edit

## 11.1 Mode création

Le formulaire démarre vide ou prérempli avec des défauts métier simples :

* `status = DRAFT`
* `currency = EUR` quand applicable
* `budgetId` déjà injecté depuis l’URL contextuelle
* `exerciseId` éventuellement prérempli depuis query string si disponible

Après succès :

* toast succès
* invalidation des queries liées
* redirection adaptée

## 11.2 Mode édition

Le formulaire :

* charge l’objet via son endpoint `GET :id`
* mappe les données API vers les valeurs de formulaire
* affiche un skeleton pendant chargement
* affiche un `ErrorState` si lecture impossible
* empêche le submit tant que les données initiales ne sont pas prêtes

Après succès :

* toast succès
* invalidation du détail et des listes associées
* retour vers l’écran pertinent

---

# 12. Redirections après succès

## Exercice

* création → `/budgets/exercises`
* édition → retour vers `/budgets/exercises`

## Budget

* création → `/budgets/[budgetId]`
* édition → retour vers `/budgets/[budgetId]`

## Enveloppe

* création → `/budgets/[budgetId]`
* édition → retour vers `/budgets/[budgetId]`

## Ligne

* création → `/budgets/[budgetId]`
* édition → retour vers `/budgets/[budgetId]`

## Décision UX

Le budget reste le cockpit principal. Après création d’une enveloppe ou d’une ligne, l’utilisateur revient au détail du budget pour voir immédiatement sa structure mise à jour.

---

# 13. États UX obligatoires

Chaque page formulaire gère explicitement :

## Loading initial

* skeleton ou `LoadingState`
* pas de formulaire interactif tant que les données nécessaires ne sont pas prêtes

## Error initial

* `ErrorState`
* message contextualisé
* action “Réessayer”
* action retour

## Submit loading

* bouton principal désactivé
* spinner dans le bouton
* champs désactivés si nécessaire

## Success

* toast de confirmation
* navigation automatique

## Error submit

* bannière d’erreur globale si erreur serveur
* rattachement des erreurs champs quand possible
* conservation des données saisies

Cette gestion explicite des états est cohérente avec les règles frontend du projet.

---

# 14. Gestion des erreurs API

Le client API central gère déjà les erreurs techniques et d’authentification. La couche formulaire doit transformer les erreurs métier en messages UX exploitables.

## Cas attendus

* `400` : validation backend ou incohérence métier
* `401` : session expirée
* `403` : permission refusée / client actif invalide
* `404` : ressource introuvable
* `409` : conflit si le backend en renvoie un plus tard

## Rendu UX

* erreurs globales sous forme d’alert
* erreurs de champ mappées quand le format backend le permet
* message par défaut :

  * “Impossible d’enregistrer les modifications.”
  * “Vous n’avez pas les droits nécessaires.”
  * “L’objet demandé est introuvable.”

---

# 15. Query keys et invalidation

Toutes les clés métier doivent rester tenant-aware et inclure `clientId`.

## Invalidation minimale après mutation

### Exercice

* liste des exercices
* détail exercice
* listes budgets dépendantes si création impactante

### Budget

* liste des budgets
* détail budget
* éventuellement dashboard budget si déjà branché

### Enveloppe

* détail budget
* liste des enveloppes du budget
* reporting enveloppes si présent

### Ligne

* détail budget
* liste des lignes du budget
* listes de reporting liées à l’enveloppe

---

# 16. Composants UI attendus

## Composants partagés

* `PageHeader`
* `LoadingState`
* `ErrorState`
* `EmptyState` si nécessaire
* `FormSection`
* `FormField`
* `FormActionsSticky` ou footer d’actions

## Boutons

* primaire : `Enregistrer`
* secondaire : `Annuler`

## Comportement

* footer d’actions toujours visible ou clairement accessible
* labels explicites
* aides courtes sous les champs techniques si utile
* pas de jargon inutile pour les utilisateurs métier

---

# 17. Accessibilité et ergonomie

* labels associés à chaque champ
* messages d’erreur lisibles
* focus sur le premier champ invalide au submit
* navigation clavier correcte
* largeur de formulaire confortable
* regroupement logique des champs par section

## Groupes recommandés

### Budget

* Identité
* Rattachement
* Pilotage

### Ligne budgétaire

* Identité
* Rattachement
* Nature de dépense
* Montants

---

# 18. Décisions de design

## 18.1 Pas de modal pour les formulaires principaux

Décision : utiliser de vraies pages de formulaire, pas des modales, pour :

* meilleure lisibilité
* contexte plus clair
* URL partageable
* navigation robuste
* meilleure évolutivité

## 18.2 Pas de wizard

Décision : un formulaire simple par entité suffit pour le MVP.

## 18.3 Pas de création inline dans cette RFC

Décision : pas de création d’exercice ou d’enveloppe “à la volée” depuis un autre formulaire.
Les dépendances doivent exister avant, ou être créées via leur propre écran.

---

# 19. Critères d’acceptation

## Exercice

* l’utilisateur peut créer un exercice depuis l’UI
* l’utilisateur peut modifier un exercice existant
* les validations de base fonctionnent
* le submit affiche loading/error/success
* redirection correcte après succès

## Budget

* l’utilisateur peut créer un budget avec choix d’exercice
* l’utilisateur peut modifier un budget
* `currency` et `status` sont gérés proprement
* redirection vers le cockpit budget après création

## Enveloppe

* l’utilisateur peut créer une enveloppe dans un budget
* l’utilisateur peut modifier une enveloppe
* le type d’enveloppe est sélectionnable
* retour au budget après succès

## Ligne

* l’utilisateur peut créer une ligne dans un budget
* l’utilisateur choisit l’enveloppe cible
* les montants sont validés côté UI
* l’utilisateur peut modifier la ligne
* retour au budget après succès

## Technique

* aucune requête métier sans `X-Client-Id`
* toutes les mutations passent par le client API central
* les query keys incluent le `clientId`
* aucune logique métier critique n’est dupliquée côté frontend.

---

# 20. Impact technique

## Ajouts frontend

* nouveaux schémas Zod
* nouveaux hooks de mutation
* nouveaux composants de formulaire
* nouvelles pages App Router
* nouvelles invalidations TanStack Query

## Aucun impact backend

Cette RFC consomme les endpoints existants du module budget-management sans ajout d’API.

---

# 21. Ordre d’implémentation recommandé

1. API mutations frontend + schémas
2. formulaire Exercice
3. formulaire Budget
4. formulaire Enveloppe
5. formulaire Ligne
6. redirections + toasts
7. polish UX + tests

---

# 22. Résultat attendu

À l’issue de cette RFC, le module Budget cesse d’être uniquement consultatif côté frontend.

L’utilisateur peut structurer son budget directement depuis l’interface Starium Orchestra en respectant :

* l’architecture API-first
* le contexte multi-client
* les permissions backend
* une UX homogène avec le cockpit produit.

---

# 23. Implémentation

Implémenté selon le plan RFC-FE-015 : formulaires React Hook Form + Zod, mutations TanStack Query, type `ApiFormError` et `parseApiFormError` pour toutes les mutations et l’API general-ledger-accounts, query key `exerciseDetail(clientId, id)`, routes `exercises/[id]/edit`, `[budgetId]/edit`, `budget-envelopes/[envelopeId]/edit`, `budget-lines/[lineId]/edit`, constantes dans `budget-routes.ts`, bouton Annuler via `cancelHref` (pas `router.back()`), redirections déterministes après succès, options requises absentes désactivant le submit (ligne), focus premier champ en erreur. Référence code : `apps/web/src/features/budgets/` (api, hooks, schemas, mappers, components/forms, components/pages) et pages sous `app/(protected)/budgets/`, `budget-envelopes/`, `budget-lines/`.
